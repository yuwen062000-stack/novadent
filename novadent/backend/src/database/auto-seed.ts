import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const SALT      = 12; // 正式使用者 bcrypt 強度
const SEED_SALT =  8; // 測試帳號用較低強度（加速 seed，降低 Replit CPU 超時風險）

async function hash(pw: string, rounds = SALT) { return bcrypt.hash(pw, rounds); }

async function ensureDefaultPasswords(pool: Pool) {
  // 只補「尚未改過密碼」的帳號（force_change_password = true 表示仍在初始狀態）
  // 已手動改過密碼的帳號（force_change_password = false）不會被重置
  // 這樣每次 Replit 重啟不會把管理員改好的密碼蓋回預設值
  const TEST_PW = 'admin@123';
  const emails = [
    'superadmin@novadent.com',
    'admin@novadent.com',
    'taipei-clinic@novadent.com',
    'taichung-clinic@novadent.com',
    'kaohsiung-clinic@novadent.com',
    'precision-lab@novadent.com',
    'artisan-lab@novadent.com',
    'member1@test.com',
  ];

  // 先查詢哪些帳號還在「強制改密碼」狀態（即尚未改過）
  const { rows: needReset } = await pool.query(
    `SELECT email FROM users WHERE email = ANY($1) AND force_change_password = true`,
    [emails]
  );
  if (needReset.length === 0) {
    console.log('[AutoSeed] Default passwords: all accounts already changed, skipping');
    return;
  }

  const h = await hash(TEST_PW, SEED_SALT); // ← 只在有需要時才算 hash
  for (const { email } of needReset) {
    try {
      await pool.query(
        `UPDATE users SET password_hash = $1 WHERE email = $2 AND force_change_password = true`,
        [h, email]
      );
    } catch (e: any) {
      console.error(`[AutoSeed] Password reset failed for ${email}:`, e.message);
    }
  }
  console.log(`[AutoSeed] Default passwords ensured for ${needReset.length} account(s) with force_change_password=true`);
}

async function deduplicateAndSeedMenu(pool: Pool) {
  await pool.query(`
    DELETE FROM mfg_step_templates
    WHERE id NOT IN (
      SELECT DISTINCT ON (name) id FROM mfg_step_templates ORDER BY name, is_active DESC, id
    )
  `);
  console.log('[AutoSeed] Deduplicated mfg_step_templates');

  await pool.query(`
    DELETE FROM qa_questions
    WHERE question_text LIKE '%CRUD%' OR question_text = 'updated'
  `);
  await pool.query(`
    DELETE FROM qa_questions
    WHERE id NOT IN (
      SELECT DISTINCT ON (question_text) id FROM qa_questions ORDER BY question_text, is_active DESC, id
    )
  `);
  // 注意：不強制重置 is_active，保留管理員已手動停用的 QA 問題（Fix #8）
  console.log('[AutoSeed] Deduplicated qa_questions');

  // ── 遷移：clinics/labs 去重（每個 user_id 只保留最早的一筆）───────
  // 注意：排除被 cases 引用的 clinics/labs，避免外鍵約束錯誤
  try {
    await pool.query(`
      DELETE FROM clinics a USING clinics b
      WHERE a.user_id = b.user_id AND a.created_at > b.created_at
        AND a.id NOT IN (SELECT DISTINCT clinic_id FROM cases WHERE clinic_id IS NOT NULL)
    `);
    await pool.query(`
      DELETE FROM labs a USING labs b
      WHERE a.user_id = b.user_id AND a.created_at > b.created_at
        AND a.id NOT IN (SELECT DISTINCT lab_id FROM cases WHERE lab_id IS NOT NULL)
    `);
    console.log('[AutoSeed] Deduplicated clinics/labs (kept oldest per user_id)');
  } catch (e: any) {
    console.warn('[AutoSeed] clinics/labs dedup skipped:', e.message);
  }

  // ── 遷移：建立 clinic_tags 表並塞入預設 tag ─────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_tags (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        VARCHAR(50) NOT NULL UNIQUE,
      sort_order  INT NOT NULL DEFAULT 0,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const defaultTags = [
    '固定式假牙','活動假牙','植牙牙冠','全瓷冠','鋯瓷假牙',
    '數位掃描','全口重建','牙橋','分期付款','週末看診',
    '夜間門診','中文服務','英文服務','兒童牙科',
  ];
  const { rows: existingTags } = await pool.query(`SELECT count(*)::int as cnt FROM clinic_tags`);
  console.log(`[AutoSeed] clinic_tags existing count: ${existingTags[0].cnt}`);
  let inserted = 0;
  for (let i = 0; i < defaultTags.length; i++) {
    const { rowCount } = await pool.query(
      `INSERT INTO clinic_tags (name, sort_order) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
      [defaultTags[i], i]
    );
    if (rowCount && rowCount > 0) inserted++;
  }
  console.log(`[AutoSeed] clinic_tags table ready (inserted ${inserted} new default tags)`);

  // ── 遷移：clinic_tags 加 target_type 欄位（CLINIC/LAB/ALL）──
  await pool.query(`ALTER TABLE clinic_tags ADD COLUMN IF NOT EXISTS target_type VARCHAR(10) NOT NULL DEFAULT 'ALL'`);

  // ── 遷移：建立 system_options 表並塞入預設選項 ───────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_options (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "group"     VARCHAR(30) NOT NULL,
      value       VARCHAR(50) NOT NULL,
      label       VARCHAR(50) NOT NULL,
      sort_order  INT NOT NULL DEFAULT 0,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // 預設文章分類
  const articleCats = [
    { value: '假牙百科', label: '假牙百科', order: 0 },
    { value: '口腔護理', label: '口腔護理', order: 1 },
    { value: '診所指南', label: '診所指南', order: 2 },
    { value: '最新消息', label: '最新消息', order: 3 },
  ];
  for (const c of articleCats) {
    await pool.query(
      `INSERT INTO system_options ("group", value, label, sort_order) SELECT $1::varchar, $2::varchar, $3::varchar, $4::int WHERE NOT EXISTS (SELECT 1 FROM system_options WHERE "group"=$1::varchar AND value=$2::varchar)`,
      ['ARTICLE_CATEGORY', c.value, c.label, c.order]
    );
  }
  // 預設案件類型
  const caseTypes = [
    { value: 'FIXED',     label: '固定式假牙', order: 0 },
    { value: 'REMOVABLE', label: '活動式假牙', order: 1 },
    { value: 'IMPLANT',   label: '植牙牙冠',   order: 2 },
  ];
  for (const c of caseTypes) {
    await pool.query(
      `INSERT INTO system_options ("group", value, label, sort_order) SELECT $1::varchar, $2::varchar, $3::varchar, $4::int WHERE NOT EXISTS (SELECT 1 FROM system_options WHERE "group"=$1::varchar AND value=$2::varchar)`,
      ['CASE_TYPE', c.value, c.label, c.order]
    );
  }
  console.log('[AutoSeed] system_options table ready');

  // ── 遷移：確保新欄位存在（舊站升級不需手動跑 migration）───────
  await pool.query(`ALTER TABLE menu_config ADD COLUMN IF NOT EXISTS menu_type VARCHAR(20) NOT NULL DEFAULT 'PUBLIC'`);
  await pool.query(`ALTER TABLE menu_config ADD COLUMN IF NOT EXISTS parent_id UUID`);
  await pool.query(`ALTER TABLE menu_config ADD COLUMN IF NOT EXISTS show_in_footer BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE menu_config ALTER COLUMN path SET DEFAULT ''`);

  // ── 更新現有資料的 menu_type（ADMIN 類型）──────────────────────
  const adminPaths = [
    '/member/qa','/member/recs','/member/cases',
    '/clinic/cases','/lab/cases',
    '/admin','/admin/dashboard','/admin/users','/admin/clinics','/admin/labs','/admin/partner-links',
    '/admin/articles','/admin/site-images','/admin/videos','/admin/notifications',
    '/admin/content','/super/system','/super/advanced',
    '/super/settings','/super/menu',
    '/super/qa','/super/qa-questions',
    '/super/mfg','/super/mfg-templates',
    '/super/audit','/super/audit-logs',
  ];
  for (const p of adminPaths) {
    await pool.query(`UPDATE menu_config SET menu_type = 'ADMIN' WHERE path = $1`, [p]);
  }

  // ── 統一舊路徑至新路徑（升級相容）─────────────────────────────
  await pool.query(`UPDATE menu_config SET path = '/admin/dashboard' WHERE path = '/admin' AND label IN ('總覽儀表板','統計儀表板','儀表板')`);
  await pool.query(`UPDATE menu_config SET path = '/super/audit-logs' WHERE path = '/super/audit'`);
  await pool.query(`UPDATE menu_config SET path = '/super/qa-questions' WHERE path = '/super/qa'`);
  await pool.query(`UPDATE menu_config SET path = '/super/mfg-templates' WHERE path = '/super/mfg'`);

  // ── 確保 Admin 內容管理路徑的 roles 包含 ADMIN（每次啟動都執行，修正可能被手動改壞的資料）──
  // 這些路徑 ADMIN 和 SUPER_ADMIN 都應能存取，不能只設 SUPER_ADMIN
  const adminContentPaths = [
    '/admin/articles', '/admin/notifications', '/admin/site-images', '/admin/videos',
    '/admin/content',
    '/admin/dashboard', '/admin/users', '/admin/clinics', '/admin/labs',
    '/admin/partner-links', '/admin/consultations',
  ];
  for (const p of adminContentPaths) {
    await pool.query(
      `UPDATE menu_config SET roles = ARRAY['ADMIN','SUPER_ADMIN'] WHERE path = $1 AND NOT (roles @> ARRAY['ADMIN']::text[])`,
      [p]
    );
  }

  // ── 設定前台 show_in_footer 初始值（只補 false 的，不覆蓋管理員已修改的 true→false）──
  // 注意：這裡不做強制覆蓋，改用「目前為 false 才更新為 true」，避免管理員設定被 seed 蓋掉
  // 這一行已停用：改為 INSERT WHERE NOT EXISTS 模式，保留管理員的設定
  // await pool.query(`UPDATE menu_config SET show_in_footer = true WHERE path IN ('/about', '/knowledge', '/videos') AND menu_type = 'PUBLIC'`);
  console.log('[AutoSeed] menu_config columns migrated & menu_type updated');

  // ── 寫入預設 SEO 設定（不存在才 INSERT，避免覆蓋管理員已設定的值）──
  const defaultSeoSettings: [string, string, string][] = [
    ['seo_title',          'Novadent 諾星 — 牙科整合協作平台',                                               'SEO 網頁標題（瀏覽器 tab 顯示）'],
    ['seo_description',    'Novadent 連結診所、牙技所與會員，提供透明化假牙製程追蹤與 QA 問診推薦。',      'SEO Meta 描述'],
    ['seo_og_title',       'Novadent 諾星 — 牙科整合協作平台',                                               'OG 社群分享標題'],
    ['seo_og_description', '連結診所、牙技所與會員，建立醫療信任新標準。',                                   'OG 社群分享描述'],
    ['seo_og_url',         'https://novadent.replit.app',                                                     '網站標準 URL'],
  ];
  for (const [key, value, description] of defaultSeoSettings) {
    await pool.query(
      `INSERT INTO system_settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO NOTHING`,
      [key, value, description]
    );
  }
  console.log('[AutoSeed] Default SEO settings ensured');

  // ── 若表是空的，寫入預設選單 ──────────────────────────────────
  const { rows: menuRows } = await pool.query('SELECT count(*)::int as cnt FROM menu_config');
  if (menuRows[0].cnt === 0) {
    // 前台公開選單（PUBLIC）
    const publicItems: [string, string, string[], number, boolean][] = [
      ['首頁',      '/',          ['GUEST','MEMBER','CLINIC','LAB','ADMIN','SUPER_ADMIN'], 0, false],
      ['關於我們',  '/about',     ['GUEST','MEMBER','CLINIC','LAB','ADMIN','SUPER_ADMIN'], 1, true],
      ['衛教中心',  '/knowledge', ['GUEST','MEMBER','CLINIC','LAB','ADMIN','SUPER_ADMIN'], 2, true],
      ['影音專區',  '/videos',    ['GUEST','MEMBER','CLINIC','LAB','ADMIN','SUPER_ADMIN'], 3, true],
      ['合作診所',  '/clinics',   ['GUEST','MEMBER'], 4, false],
      ['合作牙技所','/labs',      ['GUEST','MEMBER'], 5, false],
    ];
    for (const [label, path, roles, order, showInFooter] of publicItems) {
      await pool.query(
        `INSERT INTO menu_config (label, path, roles, "order", visible, menu_type, show_in_footer)
         VALUES ($1,$2,$3,$4,true,'PUBLIC',$5) ON CONFLICT DO NOTHING`,
        [label, path, roles, order, showInFooter]
      );
    }

    // 後台登入後選單（ADMIN）— 先建立父群組，再建子項目
    // 父群組有虛擬路徑（以 /group/ 前綴），方便前端 Sidebar 依路徑對應名稱
    // 父群組 1：內容管理（ADMIN+SUPER_ADMIN）
    const { rows: r1 } = await pool.query(
      `INSERT INTO menu_config (label, path, roles, "order", visible, menu_type)
       VALUES ('內容管理','/admin/content','{ADMIN,SUPER_ADMIN}',14,true,'ADMIN') RETURNING id`
    );
    const contentGroupId = r1[0].id;

    // 父群組 2：系統管理（SUPER_ADMIN）
    const { rows: r2 } = await pool.query(
      `INSERT INTO menu_config (label, path, roles, "order", visible, menu_type)
       VALUES ('系統管理','/super/system','{SUPER_ADMIN}',18,true,'ADMIN') RETURNING id`
    );
    const systemGroupId = r2[0].id;

    // 父群組 3：進階設定（SUPER_ADMIN）
    const { rows: r3 } = await pool.query(
      `INSERT INTO menu_config (label, path, roles, "order", visible, menu_type)
       VALUES ('進階設定','/super/advanced','{SUPER_ADMIN}',20,true,'ADMIN') RETURNING id`
    );
    const advGroupId = r3[0].id;

    // 後台獨立項目（無父群組）— 路徑與前端 Sidebar ml() 對應一致
    const adminItems: [string, string, string[], number][] = [
      ['假牙問診',   '/member/qa',           ['MEMBER'],              6],
      ['推薦診所',   '/member/recs',         ['MEMBER'],              7],
      ['案件追蹤',   '/member/cases',        ['MEMBER'],              8],
      ['案件管理',   '/clinic/cases',        ['CLINIC'],              9],
      ['案件管理',   '/lab/cases',           ['LAB'],                 10],
      ['統計儀表板', '/admin/dashboard',     ['ADMIN','SUPER_ADMIN'], 11],
      ['帳號管理',   '/admin/users',         ['ADMIN','SUPER_ADMIN'], 12],
      ['診所管理',   '/admin/clinics',       ['ADMIN','SUPER_ADMIN'], 13],
      ['牙技所管理', '/admin/labs',          ['ADMIN','SUPER_ADMIN'], 14],
      ['合作連結',   '/admin/partner-links', ['ADMIN','SUPER_ADMIN'], 15],
    ];
    for (const [label, path, roles, order] of adminItems) {
      await pool.query(
        `INSERT INTO menu_config (label, path, roles, "order", visible, menu_type)
         VALUES ($1,$2,$3,$4,true,'ADMIN') ON CONFLICT DO NOTHING`,
        [label, path, roles, order]
      );
    }

    // 內容管理 子項目
    const contentChildren: [string, string, number][] = [
      ['文章管理',  '/admin/articles',       1],
      ['通知廣播',  '/admin/notifications',  2],
      ['圖片管理',  '/admin/site-images',    3],
      ['影音管理',  '/admin/videos',         4],
    ];
    for (const [label, path, order] of contentChildren) {
      await pool.query(
        `INSERT INTO menu_config (label, path, roles, "order", visible, menu_type, parent_id)
         VALUES ($1,$2,'{ADMIN,SUPER_ADMIN}',$3,true,'ADMIN',$4)`,
        [label, path, order, contentGroupId]
      );
    }

    // 系統管理 子項目（選單管理也歸入此群組）
    const systemChildren: [string, string, number][] = [
      ['系統設定', '/super/settings',   1],
      ['選單管理', '/super/menu',       2],
      ['稽核日誌', '/super/audit-logs', 3],
    ];
    for (const [label, path, order] of systemChildren) {
      await pool.query(
        `INSERT INTO menu_config (label, path, roles, "order", visible, menu_type, parent_id)
         VALUES ($1,$2,'{SUPER_ADMIN}',$3,true,'ADMIN',$4)`,
        [label, path, order, systemGroupId]
      );
    }

    // 進階設定 子項目
    const advChildren: [string, string, number][] = [
      ['QA問卷管理', '/super/qa-questions',  1],
      ['製程模板',   '/super/mfg-templates', 2],
    ];
    for (const [label, path, order] of advChildren) {
      await pool.query(
        `INSERT INTO menu_config (label, path, roles, "order", visible, menu_type, parent_id)
         VALUES ($1,$2,'{SUPER_ADMIN}',$3,true,'ADMIN',$4)`,
        [label, path, order, advGroupId]
      );
    }

    console.log('[AutoSeed] Menu config seeded with default items (PUBLIC + ADMIN with parent groups)');
  } else {
    // ── 現有安裝修復流程 ─────────────────────────────────────────

    // ── 廢棄路徑清除（功能移除時同步從 menu_config 刪除）─────────
    // /member/cases：案件追蹤功能已移除（無法 mapping 會員與案件）
    await pool.query(`DELETE FROM menu_config WHERE path = '/member/cases'`);

    // Step 1：去除所有重複路徑（保留 id 最小的那筆）
    // 注意：menu_config 沒有 created_at 欄位，必須用 id 排序
    await pool.query(`
      DELETE FROM menu_config
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (PARTITION BY path ORDER BY id) AS rn
          FROM menu_config
          WHERE path <> '' AND path IS NOT NULL
        ) t WHERE rn > 1
      )
    `);
    console.log('[AutoSeed] Deduplicated menu_config by path');

    // Step 2：建立父群組（若不存在）
    const ensureParent = async (label: string, path: string, roles: string[], order: number) => {
      const { rows } = await pool.query(
        `SELECT id FROM menu_config WHERE (path = $1 OR (label = $2 AND (path = '' OR path IS NULL))) AND menu_type = 'ADMIN' LIMIT 1`,
        [path, label]
      );
      if (rows.length > 0) {
        await pool.query(`UPDATE menu_config SET path = $1 WHERE id = $2 AND (path = '' OR path IS NULL)`, [path, rows[0].id]);
        return rows[0].id as string;
      }
      const { rows: ins } = await pool.query(
        `INSERT INTO menu_config (label, path, roles, "order", visible, menu_type)
         VALUES ($1,$2,$3,$4,true,'ADMIN') RETURNING id`,
        [label, path, roles, order]
      );
      return ins[0].id as string;
    };

    const contentId = await ensureParent('內容管理', '/admin/content',  ['ADMIN','SUPER_ADMIN'], 14);
    const systemId  = await ensureParent('系統管理', '/super/system',   ['SUPER_ADMIN'], 18);
    const advId     = await ensureParent('進階設定', '/super/advanced', ['SUPER_ADMIN'], 20);

    // Step 3：補建所有缺失的子選單（INSERT WHERE NOT EXISTS）
    type ChildDef = [string, string, string[], number, string];
    const allChildren: ChildDef[] = [
      // 內容管理子項目
      ['文章管理',  '/admin/articles',       ['ADMIN','SUPER_ADMIN'], 1, contentId],
      ['通知廣播',  '/admin/notifications',  ['ADMIN','SUPER_ADMIN'], 2, contentId],
      ['圖片管理',  '/admin/site-images',    ['ADMIN','SUPER_ADMIN'], 3, contentId],
      ['影音管理',  '/admin/videos',         ['ADMIN','SUPER_ADMIN'], 4, contentId],
      // 系統管理子項目
      ['系統設定',  '/super/settings',       ['SUPER_ADMIN'], 1, systemId],
      ['選單管理',  '/super/menu',           ['SUPER_ADMIN'], 2, systemId],
      ['稽核日誌',  '/super/audit-logs',     ['SUPER_ADMIN'], 3, systemId],
      // 進階設定子項目
      ['QA問卷管理','/super/qa-questions',   ['SUPER_ADMIN'], 1, advId],
      ['製程模板',  '/super/mfg-templates',  ['SUPER_ADMIN'], 2, advId],
    ];
    for (const [label, path, roles, order, parentId] of allChildren) {
      // 若路徑已存在：更新 parent_id；若不存在：新建
      const { rows: existing } = await pool.query(
        `SELECT id FROM menu_config WHERE path = $1 LIMIT 1`, [path]
      );
      if (existing.length > 0) {
        // 只更新結構性欄位（parent_id、roles、order、menu_type），不覆蓋 label
        // 避免管理員在後台修改的選單名稱被 seed 重置
        await pool.query(
          `UPDATE menu_config SET parent_id = $1, roles = $2, "order" = $3, menu_type = 'ADMIN' WHERE id = $4`,
          [parentId, roles, order, existing[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO menu_config (label, path, roles, "order", visible, menu_type, parent_id)
           VALUES ($1,$2,$3,$4,true,'ADMIN',$5)`,
          [label, path, roles, order, parentId]
        );
      }
    }

    // Step 4：確保所有登入後 Sidebar 的獨立項目存在（INSERT WHERE NOT EXISTS，不覆蓋 label）
    type StandaloneDef = [string, string, string[], number];
    const standaloneItems: StandaloneDef[] = [
      // MEMBER
      ['假牙問診',    '/member/qa',              ['MEMBER'],              6],
      ['推薦診所',    '/member/recs',            ['MEMBER'],              7],
      // CLINIC
      ['案件管理',    '/clinic/cases',           ['CLINIC'],              9],
      ['新建案件',    '/clinic/create-case',     ['CLINIC'],              10],
      ['診所資料',    '/clinic/profile',         ['CLINIC'],              11],
      ['合作牙技所',  '/clinic/partner-labs',    ['CLINIC'],              12],
      // LAB
      ['案件管理',    '/lab/cases',              ['LAB'],                 13],
      ['牙技所資料',  '/lab/profile',            ['LAB'],                 14],
      ['合作診所',    '/lab/partner-clinics',    ['LAB'],                 15],
      // ADMIN
      ['統計儀表板',  '/admin/dashboard',        ['ADMIN','SUPER_ADMIN'], 16],
      ['帳號管理',    '/admin/users',            ['ADMIN','SUPER_ADMIN'], 17],
      ['診所管理',    '/admin/clinics',          ['ADMIN','SUPER_ADMIN'], 18],
      ['牙技所管理',  '/admin/labs',             ['ADMIN','SUPER_ADMIN'], 19],
      ['合作連結',    '/admin/partner-links',    ['ADMIN','SUPER_ADMIN'], 20],
      ['會員諮詢',    '/admin/consultations',    ['ADMIN','SUPER_ADMIN'], 21],  // 新功能：Admin 查看會員 QA 問診記錄
    ];
    for (const [label, path, roles, order] of standaloneItems) {
      const { rows: ex } = await pool.query(`SELECT id FROM menu_config WHERE path = $1 LIMIT 1`, [path]);
      if (ex.length === 0) {
        // 不存在才 INSERT，保留管理員已修改的名稱
        await pool.query(
          `INSERT INTO menu_config (label, path, roles, "order", visible, menu_type) VALUES ($1,$2,$3,$4,true,'ADMIN')`,
          [label, path, roles, order]
        );
      }
    }

    console.log('[AutoSeed] Existing menu_config: deduped + parent groups + children ensured');
  }
}

async function seedSystemSettings(pool: Pool) {
  const defaults: [string, string, string][] = [
    ['smtp_host', 'smtp.gmail.com', 'SMTP 伺服器地址（Gmail）'],
    ['smtp_port', '587', 'SMTP 通訊埠'],
    ['smtp_secure', 'false', 'SMTP 是否使用 SSL'],
    ['smtp_user', '', 'SMTP 帳號（Gmail 地址）'],
    ['smtp_pass', '', 'SMTP 密碼（Gmail 應用程式密碼）'],
    ['smtp_from', 'noreply@novadent.com', '預設寄件者信箱'],
    ['site_name', 'Novadent 諾星牙科平台', '網站名稱'],
  ];
  for (const [key, value, desc] of defaults) {
    await pool.query(
      `INSERT INTO system_settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO NOTHING`,
      [key, value, desc],
    );
  }
  console.log('[AutoSeed] System settings GMAIL defaults seeded');
}

// ── page_contents 預設內容（聯絡資訊、服務條款、隱私權政策）──────
// 對應 Footer 顯示的聯絡資訊、TermsPage、PrivacyPage 的內容來源
async function seedPageContents(pool: Pool) {
  // 先確保資料表存在（drizzle migration 若未執行也能自動建表）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_contents (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key         VARCHAR(100) NOT NULL UNIQUE,
      content_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
      value       TEXT,
      updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_by  UUID REFERENCES users(id)
    )
  `);
  const { rows } = await pool.query(`SELECT COUNT(*)::int as cnt FROM page_contents`);
  if (rows[0].cnt === 0) {
    await pool.query(`
      INSERT INTO page_contents (key, value, content_type)
      VALUES
        ('CONTACT_PHONE',   '',                                                            'TEXT'),
        ('CONTACT_EMAIL',   '',                                                            'TEXT'),
        ('CONTACT_ADDRESS', '',                                                            'TEXT'),
        ('SOCIAL_FACEBOOK', '',                                                            'TEXT'),
        ('SOCIAL_LINE',     '',                                                            'TEXT'),
        ('TERMS',   '# 服務條款\n\n請在後台「系統設定 → 法律聲明」輸入服務條款內容。',    'RICHTEXT'),
        ('PRIVACY', '# 隱私權政策\n\n請在後台「系統設定 → 法律聲明」輸入隱私權政策內容。','RICHTEXT')
      ON CONFLICT DO NOTHING
    `);
    console.log('[AutoSeed] page_contents defaults seeded');
  }
}

// ── site_images 預設內容（ABOUT 頁文字區塊）────────────────────
// 避免 /about 頁面因 DB 無資料而永遠卡在「載入中...」
async function seedSiteImages(pool: Pool) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int as cnt FROM site_images WHERE page = 'ABOUT'`);
  if (rows[0].cnt === 0) {
    await pool.query(`
      INSERT INTO site_images (page, position, block_type, title, text_content, visible, sort_order)
      VALUES
        ('ABOUT', 'BLOCK_1', 'text',
         '關於 Novadent 諾星',
         'Novadent 是一個會員制牙科整合服務平台，專為需要假牙、牙套等較長週期牙科服務的民眾設計。\n平台解決的核心問題：牙科假牙流程漫長（通常數週至數月）、資訊不透明、診所選擇困難、製程進度無從追蹤。',
         true, 1),
        ('ABOUT', 'BLOCK_2', 'text',
         '我們的服務',
         '透過平台的 QA 問答系統，民眾可以描述自身牙齒狀況，平台根據地區與需求推薦合適的合作診所。診所接案後，可指派配合的牙技所執行假牙製作，並即時回報製程節點進度。',
         true, 2)
      ON CONFLICT DO NOTHING
    `);
    console.log('[AutoSeed] site_images ABOUT blocks seeded');
  }
}

export async function autoSeed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // ensureDefaultPasswords 已移除 — 密碼管理應透過後台「重設密碼」功能處理，
    // 不應在每次啟動時由 seed 干預，避免交付客戶後成為安全漏洞
    await deduplicateAndSeedMenu(pool);
    await seedSystemSettings(pool);
    await seedPageContents(pool);  // 聯絡資訊、服務條款、隱私權政策預設資料
    await seedSiteImages(pool);

    const { rows } = await pool.query('SELECT count(*)::int as cnt FROM users WHERE role != $1', ['MEMBER']);
    if (rows[0].cnt >= 5) {
      console.log('[AutoSeed] Seed data already exists, skipping');
      return;
    }

    console.log('[AutoSeed] Seeding database...');

    const superPw  = await hash('SuperAdmin123!');
    const adminPw  = await hash('Admin@2026');
    const clinicPw = await hash('Clinic@2026');
    const labPw    = await hash('Lab@2026');
    const memberPw = await hash('Member@2026');

    const insertUser = async (email: string, pw: string, role: string, name: string, phone: string, forceChange = false) => {
      const res = await pool.query(
        `INSERT INTO users (email, password_hash, role, name, phone, status, force_change_password)
         VALUES ($1,$2,$3,$4,$5,'ACTIVE',$6)
         ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, name=EXCLUDED.name
         RETURNING id`,
        [email, pw, role, name, phone, forceChange]
      );
      return res.rows[0]?.id as string;
    };

    const superId   = await insertUser('superadmin@novadent.com',       superPw,  'SUPER_ADMIN', '超級管理員', '02-00000000', true);
    const adminId   = await insertUser('admin@novadent.com',            adminPw,  'ADMIN',  '諾星管理員',   '02-12345678');
    const c1UserId  = await insertUser('taipei-clinic@novadent.com',    clinicPw, 'CLINIC', '台北微笑牙醫', '02-27001234');
    const c2UserId  = await insertUser('taichung-clinic@novadent.com',  clinicPw, 'CLINIC', '台中美齒牙醫', '04-23001234');
    const c3UserId  = await insertUser('kaohsiung-clinic@novadent.com', clinicPw, 'CLINIC', '高雄晶瑩牙醫', '07-33001234');
    const l1UserId  = await insertUser('precision-lab@novadent.com',    labPw,    'LAB',    '精準牙技所',   '02-28001234');
    const l2UserId  = await insertUser('artisan-lab@novadent.com',      labPw,    'LAB',    '藝匠牙技所',   '04-25001234');
    const m1Id      = await insertUser('member1@test.com',              memberPw, 'MEMBER', '陳小明',       '0912-345678');
    const m2Id      = await insertUser('member2@test.com',              memberPw, 'MEMBER', '林美玲',       '0923-456789');
    const m3Id      = await insertUser('member3@test.com',              memberPw, 'MEMBER', '王大偉',       '0934-567890');

    const insertClinic = async (userId: string, name: string, leadDoctorName: string, phone: string, email: string, city: string, district: string, address: string, types: string[], services: string[], rating: string, description: string, doctors: string[]) => {
      const res = await pool.query(
        `INSERT INTO clinics (user_id, name, lead_doctor_name, phone, email, city, district, detailed_address, treatment_types, services, accepting_referrals, rating, description, doctor_team, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,$13,'ACTIVE')
         ON CONFLICT DO NOTHING RETURNING id`,
        [userId, name, leadDoctorName, phone, email, city, district, address, types, services, rating, description, doctors]
      );
      return res.rows[0]?.id as string;
    };

    const clinic1Id = await insertClinic(c1UserId, '台北微笑牙醫診所', '林志明 醫師', '02-27001234', 'taipei-clinic@novadent.com', '台北市', '大安區', '大安路一段100號', ['FIXED','IMPLANT'], ['固定式假牙','植牙','數位掃描','全瓷冠'], '4.8', '台北市知名牙醫診所，專精固定式假牙與植牙。', ['林志明 醫師（院長）','陳雅婷 醫師']);
    const clinic2Id = await insertClinic(c2UserId, '台中美齒牙醫診所', '黃淑芬 醫師', '04-23001234', 'taichung-clinic@novadent.com', '台中市', '西屯區', '台灣大道二段250號', ['FIXED','REMOVABLE'], ['固定式假牙','活動假牙','全口重建'], '4.6', '台中地區專業假牙診所。', ['黃淑芬 醫師（院長）']);
    const clinic3Id = await insertClinic(c3UserId, '高雄晶瑩牙醫診所', '蔡建國 醫師', '07-33001234', 'kaohsiung-clinic@novadent.com', '高雄市', '苓雅區', '中正四路88號', ['FIXED','REMOVABLE','IMPLANT'], ['固定式假牙','活動假牙','植牙','全瓷冠'], '4.9', '高雄最受好評的假牙診所。', ['蔡建國 醫師（院長）']);

    const insertLab = async (userId: string, name: string, techName: string, phone: string, email: string, city: string, address: string, types: string[], specialties: string[]) => {
      const res = await pool.query(
        `INSERT INTO labs (user_id, name, lead_technician_name, phone, email, city, detailed_address, accepted_case_types, specialties, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE')
         ON CONFLICT DO NOTHING RETURNING id`,
        [userId, name, techName, phone, email, city, address, types, specialties]
      );
      return res.rows[0]?.id as string;
    };

    const lab1Id = await insertLab(l1UserId, '精準牙技所', '陳志豪 技師', '02-28001234', 'precision-lab@novadent.com', '台北市', '內湖區內湖路一段200號', ['FIXED','IMPLANT'], ['全瓷冠','鋯瓷假牙','植牙上部結構']);
    const lab2Id = await insertLab(l2UserId, '藝匠牙技所', '王美華 技師', '04-25001234', 'artisan-lab@novadent.com', '台中市', '北區進化路300號', ['FIXED','REMOVABLE'], ['金屬烤瓷冠','活動假牙']);

    if (clinic1Id && lab1Id) await pool.query(`INSERT INTO partner_links (clinic_id, lab_id, status) VALUES ($1,$2,'ACTIVE') ON CONFLICT DO NOTHING`, [clinic1Id, lab1Id]);
    if (clinic2Id && lab2Id) await pool.query(`INSERT INTO partner_links (clinic_id, lab_id, status) VALUES ($1,$2,'ACTIVE') ON CONFLICT DO NOTHING`, [clinic2Id, lab2Id]);
    if (clinic3Id && lab1Id) await pool.query(`INSERT INTO partner_links (clinic_id, lab_id, status) VALUES ($1,$2,'ACTIVE') ON CONFLICT DO NOTHING`, [clinic3Id, lab1Id]);

    const questions = [
      { text: '您目前需要哪種假牙？', type: 'single_choice', order: 1, cat: '需求', opts: [{value:'FIXED',label:'固定式假牙（牙冠/牙橋）',score:10},{value:'REMOVABLE',label:'活動式假牙（局部/全口）',score:10},{value:'IMPLANT',label:'植牙牙冠',score:10}] },
      { text: '您目前的狀況是？', type: 'single_choice', order: 2, cat: '需求', opts: [{value:'missing',label:'缺牙需要補',score:8},{value:'replace',label:'舊假牙需要更換',score:8},{value:'repair',label:'牙齒損壞需要修復',score:8},{value:'prevention',label:'預防性保護',score:5}] },
      { text: '您偏好的材質？', type: 'single_choice', order: 3, cat: '偏好', opts: [{value:'full_ceramic',label:'全瓷（美觀優先）',score:9},{value:'zirconia',label:'鋯瓷（強度兼顧）',score:9},{value:'pfm',label:'金屬烤瓷（性價比）',score:7},{value:'unsure',label:'不確定，請推薦',score:5}] },
      { text: '您的所在城市？', type: 'single_choice', order: 4, cat: '地區', opts: [{value:'台北市',label:'台北市',score:0},{value:'新北市',label:'新北市',score:0},{value:'桃園市',label:'桃園市',score:0},{value:'台中市',label:'台中市',score:0},{value:'台南市',label:'台南市',score:0},{value:'高雄市',label:'高雄市',score:0},{value:'其他',label:'其他縣市',score:0}] },
      { text: '您希望診所有哪些特點？（可複選）', type: 'multiple_choice', order: 5, cat: '偏好', opts: [{value:'installment',label:'提供分期付款',score:3},{value:'parking',label:'有充足停車位',score:2},{value:'weekend',label:'週末有門診',score:3},{value:'digital',label:'提供數位掃描',score:4},{value:'lab_partner',label:'有長期合作牙技所',score:5}] },
    ];
    for (const q of questions) {
      await pool.query(`INSERT INTO qa_questions (question_text, question_type, options, order_index, category, is_active) VALUES ($1,$2,$3,$4,$5,true) ON CONFLICT DO NOTHING`, [q.text, q.type, JSON.stringify(q.opts), q.order, q.cat]);
    }

    const steps = [['印模/數位掃描','取得牙齒模型',1],['模型分析','分析咬合關係',2],['蠟型/設計','CAD 數位設計',3],['切削/鑄造','CAD/CAM 切削',4],['上瓷/塑形','堆瓷塑形',5],['上色/拋光','特徵上色拋光',6],['品質檢驗','全面品質檢查',7],['交件','送回診所',8]];
    for (const [name, desc, order] of steps) {
      await pool.query(`INSERT INTO mfg_step_templates (name, description, order_index, is_default, is_active) VALUES ($1,$2,$3,true,true) ON CONFLICT DO NOTHING`, [name, desc, order]);
    }

    const insertCase = async (clinicId: string, labId: string, memberId: string, patientName: string, type: string, status: string, description: string, progress: number, stage: string) => {
      const res = await pool.query(`INSERT INTO cases (clinic_id, lab_id, member_id, patient_name, type, status, description, progress, current_stage) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, [clinicId, labId, memberId, patientName, type, status, description, progress, stage]);
      return res.rows[0]?.id as string;
    };

    if (clinic1Id && lab1Id && m1Id) {
      const caseId = await insertCase(clinic1Id, lab1Id, m1Id, '陳小明', 'FIXED', 'IN_PROGRESS', '上顎左側第一大臼齒全瓷冠製作', 50, '切削/鑄造');
      const caseSteps = [['印模/數位掃描',1,'COMPLETED'],['模型分析',2,'COMPLETED'],['蠟型/設計',3,'COMPLETED'],['切削/鑄造',4,'IN_PROGRESS'],['上瓷/塑形',5,'PENDING'],['上色/拋光',6,'PENDING'],['品質檢驗',7,'PENDING'],['交件',8,'PENDING']];
      for (const [n, o, s] of caseSteps) await pool.query(`INSERT INTO mfg_steps (case_id, name, "order", status, updated_at) VALUES ($1,$2,$3,$4,NOW())`, [caseId, n, o, s]);
    }

    await pool.query(`INSERT INTO articles (slug, title, category, tags, summary, content, author, published, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8) ON CONFLICT (slug) DO NOTHING`,
      ['fixed-denture-guide','固定式假牙完整指南','假牙知識',['固定假牙','牙冠'],'固定式假牙是最常見的缺牙修復方式之一。','## 什麼是固定式假牙？\n\n固定式假牙是無法自行取下的假牙。','諾星編輯團隊', adminId]);

    await pool.query(`INSERT INTO notifications (user_id, type, title, content) VALUES ($1,'SYSTEM','歡迎加入 Novadent','歡迎使用 Novadent 牙科整合平台！')`, [m1Id]);

    console.log('[AutoSeed] Seed completed successfully');
  } catch (err: any) {
    console.error('[AutoSeed] Error:', err.message);
  } finally {
    await pool.end();
  }
}
