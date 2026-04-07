import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const SALT = 12;

async function hash(pw: string) { return bcrypt.hash(pw, SALT); }

async function ensureDefaultPasswords(pool: Pool) {
  const defaults: [string, string][] = [
    ['superadmin@novadent.com', 'SuperAdmin123!'],
    ['admin@novadent.com', 'Admin@2026'],
    ['taipei-clinic@novadent.com', 'Clinic@2026'],
    ['taichung-clinic@novadent.com', 'Clinic@2026'],
    ['kaohsiung-clinic@novadent.com', 'Clinic@2026'],
    ['precision-lab@novadent.com', 'Lab@2026'],
    ['artisan-lab@novadent.com', 'Lab@2026'],
    ['member1@test.com', 'Member@2026'],
  ];
  for (const [email, pw] of defaults) {
    const h = await hash(pw);
    await pool.query(
      `UPDATE users SET password_hash = $1, force_change_password = false WHERE email = $2`,
      [h, email]
    );
  }
  console.log('[AutoSeed] Default passwords ensured for seed accounts');
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
  await pool.query(`UPDATE qa_questions SET is_active = true`);
  console.log('[AutoSeed] Deduplicated qa_questions');

  const { rows: menuRows } = await pool.query('SELECT count(*)::int as cnt FROM menu_config');
  if (menuRows[0].cnt === 0) {
    const menuItems: [string, string, string[], number][] = [
      ['首頁',       '/',              ['GUEST','MEMBER','CLINIC','LAB','ADMIN','SUPER_ADMIN'], 0],
      ['關於我們',    '/about',         ['GUEST','MEMBER','CLINIC','LAB','ADMIN','SUPER_ADMIN'], 1],
      ['衛教中心',    '/knowledge',     ['GUEST','MEMBER','CLINIC','LAB','ADMIN','SUPER_ADMIN'], 2],
      ['影音專區',    '/videos',        ['GUEST','MEMBER','CLINIC','LAB','ADMIN','SUPER_ADMIN'], 3],
      ['合作診所',    '/clinics',       ['GUEST','MEMBER'], 4],
      ['合作牙技所',  '/labs',          ['GUEST','MEMBER'], 5],
      ['假牙問診',    '/member/qa',     ['MEMBER'], 6],
      ['推薦診所',    '/member/recs',   ['MEMBER'], 7],
      ['案件追蹤',    '/member/cases',  ['MEMBER'], 8],
      ['案件管理',    '/clinic/cases',  ['CLINIC'], 9],
      ['案件管理',    '/lab/cases',     ['LAB'], 10],
      ['總覽儀表板',  '/admin',         ['ADMIN','SUPER_ADMIN'], 11],
      ['帳號管理',    '/admin/users',   ['ADMIN','SUPER_ADMIN'], 12],
      ['診所管理',    '/admin/clinics', ['ADMIN','SUPER_ADMIN'], 13],
      ['牙技所管理',  '/admin/labs',    ['ADMIN','SUPER_ADMIN'], 14],
      ['文章管理',    '/admin/articles',['ADMIN','SUPER_ADMIN'], 15],
      ['圖片管理',    '/admin/site-images', ['ADMIN','SUPER_ADMIN'], 16],
      ['影音管理',    '/admin/videos',  ['ADMIN','SUPER_ADMIN'], 17],
      ['通知廣播',    '/admin/notifications', ['ADMIN','SUPER_ADMIN'], 18],
      ['系統設定',    '/super/settings',['SUPER_ADMIN'], 19],
      ['選單管理',    '/super/menu',    ['SUPER_ADMIN'], 20],
      ['QA問卷管理',  '/super/qa',      ['SUPER_ADMIN'], 21],
      ['製程模板',    '/super/mfg',     ['SUPER_ADMIN'], 22],
      ['稽核日誌',    '/super/audit',   ['SUPER_ADMIN'], 23],
    ];
    for (const [label, path, roles, order] of menuItems) {
      await pool.query(
        `INSERT INTO menu_config (label, path, roles, "order", visible) VALUES ($1, $2, $3, $4, true) ON CONFLICT DO NOTHING`,
        [label, path, roles, order]
      );
    }
    console.log('[AutoSeed] Menu config seeded with default items');
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
    await ensureDefaultPasswords(pool);
    await deduplicateAndSeedMenu(pool);
    await seedSystemSettings(pool);
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
