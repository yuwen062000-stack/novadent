// seed.ts — 一次性塞入所有示範資料
import 'dotenv/config';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SALT = 12;

async function q(sql: string, params: any[] = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function hash(pw: string) { return bcrypt.hash(pw, SALT); }

async function main() {
  console.log('🌱 開始塞入示範資料...\n');

  // ── 1. 使用者帳號 ──────────────────────────────────────────
  console.log('1️⃣  建立使用者帳號...');

  const adminPw  = await hash('Admin@2026');
  const clinicPw = await hash('Clinic@2026');
  const labPw    = await hash('Lab@2026');
  const memberPw = await hash('Member@2026');

  const insertUser = async (email: string, pw: string, role: string, name: string, phone: string) => {
    const rows = await q(
      `INSERT INTO users (email, password_hash, role, name, phone, status, force_change_password)
       VALUES ($1,$2,$3,$4,$5,'ACTIVE',false)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
       RETURNING id`,
      [email, pw, role, name, phone]
    );
    return rows[0]?.id as string;
  };

  const adminId   = await insertUser('admin@novadent.com',            adminPw,  'ADMIN',  '諾星管理員',   '02-12345678');
  const c1UserId  = await insertUser('taipei-clinic@novadent.com',    clinicPw, 'CLINIC', '台北微笑牙醫', '02-27001234');
  const c2UserId  = await insertUser('taichung-clinic@novadent.com',  clinicPw, 'CLINIC', '台中美齒牙醫', '04-23001234');
  const c3UserId  = await insertUser('kaohsiung-clinic@novadent.com', clinicPw, 'CLINIC', '高雄晶瑩牙醫', '07-33001234');
  const l1UserId  = await insertUser('precision-lab@novadent.com',    labPw,    'LAB',    '精準牙技所',   '02-28001234');
  const l2UserId  = await insertUser('artisan-lab@novadent.com',      labPw,    'LAB',    '藝匠牙技所',   '04-25001234');
  const m1Id      = await insertUser('member1@test.com',              memberPw, 'MEMBER', '陳小明',       '0912-345678');
  const m2Id      = await insertUser('member2@test.com',              memberPw, 'MEMBER', '林美玲',       '0923-456789');
  const m3Id      = await insertUser('member3@test.com',              memberPw, 'MEMBER', '王大偉',       '0934-567890');

  console.log('   ✅ 使用者帳號建立完成\n');

  // ── 2. 診所資料 ────────────────────────────────────────────
  console.log('2️⃣  建立診所資料...');

  const insertClinic = async (userId: string, name: string, leadDoctorName: string, phone: string, email: string, city: string, district: string, address: string, types: string[], services: string[], rating: string, description: string, doctors: string[]) => {
    const rows = await q(
      `INSERT INTO clinics (user_id, name, lead_doctor_name, phone, email, city, district, detailed_address, treatment_types, services, accepting_referrals, rating, description, doctor_team, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,$13,'ACTIVE')
       ON CONFLICT DO NOTHING RETURNING id`,
      [userId, name, leadDoctorName, phone, email, city, district, address, types, services, rating, description, doctors]
    );
    return rows[0]?.id as string;
  };

  const clinic1Id = await insertClinic(c1UserId, '台北微笑牙醫診所', '林志明 醫師', '02-27001234', 'taipei-clinic@novadent.com', '台北市', '大安區', '大安路一段100號', ['FIXED','IMPLANT'], ['固定式假牙','植牙','數位掃描','全瓷冠'], '4.8', '台北市知名牙醫診所，專精固定式假牙與植牙，採用最新數位掃描技術，讓您的假牙更精準舒適。', ['林志明 醫師（院長）','陳雅婷 醫師','張文豪 醫師']);
  const clinic2Id = await insertClinic(c2UserId, '台中美齒牙醫診所', '黃淑芬 醫師', '04-23001234', 'taichung-clinic@novadent.com', '台中市', '西屯區', '台灣大道二段250號', ['FIXED','REMOVABLE'], ['固定式假牙','活動假牙','全口重建','分期付款'], '4.6', '台中地區專業假牙診所，提供固定式與活動式假牙服務，友善的就診環境與透明的收費方式。', ['黃淑芬 醫師（院長）','吳建宏 醫師']);
  const clinic3Id = await insertClinic(c3UserId, '高雄晶瑩牙醫診所', '蔡建國 醫師', '07-33001234', 'kaohsiung-clinic@novadent.com', '高雄市', '苓雅區', '中正四路88號', ['FIXED','REMOVABLE','IMPLANT'], ['固定式假牙','活動假牙','植牙','全瓷冠','週末看診'], '4.9', '高雄最受好評的假牙診所，全方位服務，週末也有門診，方便上班族就診。', ['蔡建國 醫師（院長）','許雅雯 醫師','劉明宏 醫師']);

  console.log('   ✅ 診所資料建立完成\n');

  // ── 3. 牙技所資料 ──────────────────────────────────────────
  console.log('3️⃣  建立牙技所資料...');

  const insertLab = async (userId: string, name: string, techName: string, phone: string, email: string, city: string, address: string, types: string[], specialties: string[]) => {
    const rows = await q(
      `INSERT INTO labs (user_id, name, lead_technician_name, phone, email, city, detailed_address, accepted_case_types, specialties, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE')
       ON CONFLICT DO NOTHING RETURNING id`,
      [userId, name, techName, phone, email, city, address, types, specialties]
    );
    return rows[0]?.id as string;
  };

  const lab1Id = await insertLab(l1UserId, '精準牙技所', '陳志豪 技師', '02-28001234', 'precision-lab@novadent.com', '台北市', '內湖區內湖路一段200號', ['FIXED','IMPLANT'], ['全瓷冠','鋯瓷假牙','植牙上部結構','CAD/CAM數位製作']);
  const lab2Id = await insertLab(l2UserId, '藝匠牙技所', '王美華 技師', '04-25001234', 'artisan-lab@novadent.com', '台中市', '北區進化路300號', ['FIXED','REMOVABLE'], ['金屬烤瓷冠','活動假牙','全口重建','傳統工藝']);

  console.log('   ✅ 牙技所資料建立完成\n');

  // ── 4. 診所↔牙技所配對 ────────────────────────────────────
  console.log('4️⃣  建立合作配對...');

  if (clinic1Id && lab1Id) await q(`INSERT INTO partner_links (clinic_id, lab_id, status) VALUES ($1,$2,'ACTIVE') ON CONFLICT DO NOTHING`, [clinic1Id, lab1Id]);
  if (clinic2Id && lab2Id) await q(`INSERT INTO partner_links (clinic_id, lab_id, status) VALUES ($1,$2,'ACTIVE') ON CONFLICT DO NOTHING`, [clinic2Id, lab2Id]);
  if (clinic3Id && lab1Id) await q(`INSERT INTO partner_links (clinic_id, lab_id, status) VALUES ($1,$2,'ACTIVE') ON CONFLICT DO NOTHING`, [clinic3Id, lab1Id]);

  console.log('   ✅ 合作配對建立完成\n');

  // ── 5. QA 問卷題目 ─────────────────────────────────────────
  console.log('5️⃣  建立 QA 問卷題目...');

  const questions = [
    { text: '您目前需要哪種假牙？', type: 'single_choice', order: 1, cat: '需求', opts: [{ value:'FIXED', label:'固定式假牙（牙冠/牙橋）', score:10 },{ value:'REMOVABLE', label:'活動式假牙（局部/全口）', score:10 },{ value:'IMPLANT', label:'植牙牙冠', score:10 }] },
    { text: '您目前的狀況是？', type: 'single_choice', order: 2, cat: '需求', opts: [{ value:'missing', label:'缺牙需要補', score:8 },{ value:'replace', label:'舊假牙需要更換', score:8 },{ value:'repair', label:'牙齒損壞需要修復', score:8 },{ value:'prevention', label:'預防性保護', score:5 }] },
    { text: '您偏好的材質？', type: 'single_choice', order: 3, cat: '偏好', opts: [{ value:'full_ceramic', label:'全瓷（美觀優先）', score:9 },{ value:'zirconia', label:'鋯瓷（強度兼顧）', score:9 },{ value:'pfm', label:'金屬烤瓷（性價比）', score:7 },{ value:'unsure', label:'不確定，請推薦', score:5 }] },
    { text: '您的所在城市？', type: 'single_choice', order: 4, cat: '地區', opts: [{ value:'台北市', label:'台北市', score:0 },{ value:'新北市', label:'新北市', score:0 },{ value:'桃園市', label:'桃園市', score:0 },{ value:'台中市', label:'台中市', score:0 },{ value:'台南市', label:'台南市', score:0 },{ value:'高雄市', label:'高雄市', score:0 },{ value:'其他', label:'其他縣市', score:0 }] },
    { text: '您希望診所有哪些特點？（可複選）', type: 'multiple_choice', order: 5, cat: '偏好', opts: [{ value:'installment', label:'提供分期付款', score:3 },{ value:'parking', label:'有充足停車位', score:2 },{ value:'weekend', label:'週末有門診', score:3 },{ value:'digital', label:'提供數位掃描', score:4 },{ value:'lab_partner', label:'有長期合作牙技所', score:5 }] },
  ];

  for (const q_ of questions) {
    await q(
      `INSERT INTO qa_questions (question_text, question_type, options, order_index, category, is_active)
       VALUES ($1,$2,$3,$4,$5,true) ON CONFLICT DO NOTHING`,
      [q_.text, q_.type, JSON.stringify(q_.opts), q_.order, q_.cat]
    );
  }

  console.log('   ✅ QA 問卷題目建立完成\n');

  // ── 6. 製程節點模板 ────────────────────────────────────────
  console.log('6️⃣  建立製程節點模板...');

  const steps = [
    ['印模/數位掃描','取得牙齒模型或口內掃描數據',1],
    ['模型分析','分析咬合關係與製作規格',2],
    ['蠟型/設計','製作蠟型或 CAD 數位設計',3],
    ['切削/鑄造','使用 CAD/CAM 切削或金屬鑄造',4],
    ['上瓷/塑形','堆瓷或樹脂塑形，建立牙齒外觀',5],
    ['上色/拋光','特徵上色、外染上色與拋光處理',6],
    ['品質檢驗','尺寸、咬合、美觀全面品質檢查',7],
    ['交件','包裝完成，送回診所',8],
  ];

  for (const [name, desc, order] of steps) {
    await q(
      `INSERT INTO mfg_step_templates (name, description, order_index, is_default, is_active)
       VALUES ($1,$2,$3,true,true) ON CONFLICT DO NOTHING`,
      [name, desc, order]
    );
  }

  console.log('   ✅ 製程節點模板建立完成\n');

  // ── 7. 示範案件 + 製程節點 ────────────────────────────────
  console.log('7️⃣  建立示範案件...');

  const insertCase = async (clinicId: string, labId: string, memberId: string, patientName: string, type: string, status: string, description: string, progress: number, stage: string) => {
    const rows = await q(
      `INSERT INTO cases (clinic_id, lab_id, member_id, patient_name, type, status, description, progress, current_stage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [clinicId, labId, memberId, patientName, type, status, description, progress, stage]
    );
    return rows[0]?.id as string;
  };

  const insertStep = async (caseId: string, name: string, order: number, status: string, note?: string) => {
    await q(
      `INSERT INTO mfg_steps (case_id, name, "order", status, note, updated_at)
       VALUES ($1,$2,$3,$4,$5, NOW())`,
      [caseId, name, order, status, note || null]
    );
  };

  if (clinic1Id && lab1Id && m1Id) {
    const caseId = await insertCase(clinic1Id, lab1Id, m1Id, '陳小明', 'FIXED', 'IN_PROGRESS', '上顎左側第一大臼齒全瓷冠製作，咬合面有磨耗，需特別注意咬合高度。', 50, '切削/鑄造');
    await insertStep(caseId, '印模/數位掃描', 1, 'COMPLETED', '數位口掃完成，數據已傳送');
    await insertStep(caseId, '模型分析',     2, 'COMPLETED', '咬合分析完成，OVD +1.5mm');
    await insertStep(caseId, '蠟型/設計',   3, 'COMPLETED', 'CAD 設計完成，已確認外型');
    await insertStep(caseId, '切削/鑄造',   4, 'IN_PROGRESS', '正在切削中');
    await insertStep(caseId, '上瓷/塑形',   5, 'PENDING');
    await insertStep(caseId, '上色/拋光',   6, 'PENDING');
    await insertStep(caseId, '品質檢驗',    7, 'PENDING');
    await insertStep(caseId, '交件',        8, 'PENDING');
  }

  if (clinic2Id && lab2Id && m2Id) {
    const caseId = await insertCase(clinic2Id, lab2Id, m2Id, '林美玲', 'REMOVABLE', 'ACCEPTED', '下顎全口活動假牙重新製作，舊假牙已使用12年，需全口重建。', 25, '模型分析');
    await insertStep(caseId, '印模/數位掃描', 1, 'COMPLETED', '傳統取模完成');
    await insertStep(caseId, '模型分析',     2, 'IN_PROGRESS', '咬合記錄分析中');
    await insertStep(caseId, '蠟型/設計',   3, 'PENDING');
    await insertStep(caseId, '切削/鑄造',   4, 'PENDING');
    await insertStep(caseId, '上瓷/塑形',   5, 'PENDING');
    await insertStep(caseId, '上色/拋光',   6, 'PENDING');
    await insertStep(caseId, '品質檢驗',    7, 'PENDING');
    await insertStep(caseId, '交件',        8, 'PENDING');
  }

  if (clinic3Id && lab1Id && m3Id) {
    const caseId = await insertCase(clinic3Id, lab1Id, m3Id, '王大偉', 'IMPLANT', 'COMPLETED', '上顎右側植牙牙冠製作，種體已骨整合完成，製作鋯瓷牙冠。', 100, '交件');
    for (const [name, order] of [['印模/數位掃描',1],['模型分析',2],['蠟型/設計',3],['切削/鑄造',4],['上瓷/塑形',5],['上色/拋光',6],['品質檢驗',7],['交件',8]]) {
      await insertStep(caseId, name as string, order as number, 'COMPLETED');
    }
  }

  console.log('   ✅ 示範案件建立完成\n');

  // ── 8. 衛教文章 ────────────────────────────────────────────
  console.log('8️⃣  建立衛教文章...');

  await q(
    `INSERT INTO articles (slug, title, category, tags, summary, content, author, published, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8) ON CONFLICT (slug) DO NOTHING`,
    ['fixed-denture-guide','固定式假牙完整指南：牙冠、牙橋你該知道的事','假牙知識',['固定假牙','牙冠','牙橋','全瓷冠'],'固定式假牙是最常見的缺牙修復方式之一，本文帶您了解牙冠、牙橋的差異、材質選擇與製作流程。','## 什麼是固定式假牙？\n\n固定式假牙是無法自行取下的假牙，必須黏著或固定在自然牙或植體上。常見的形式包括牙冠與牙橋。\n\n### 材質選擇\n\n| 材質 | 優點 | 缺點 |\n|------|------|------|\n| 全瓷冠 | 美觀透明、生物相容性佳 | 價格較高 |\n| 鋯瓷冠 | 強度高、美觀 | 中等價位 |\n| 金屬烤瓷 | 強度佳、價格合理 | 邊緣可能有黑線 |','諾星編輯團隊', adminId]
  );

  await q(
    `INSERT INTO articles (slug, title, category, tags, summary, content, author, published, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8) ON CONFLICT (slug) DO NOTHING`,
    ['removable-denture-care','活動假牙保養完全攻略：讓假牙用得久、用得舒適','假牙保養',['活動假牙','假牙保養','清潔','全口假牙'],'活動假牙需要正確的清潔與保養方式，才能延長使用壽命並維護口腔健康。','## 日常清潔\n\n- 飯後取下，用軟毛刷清潔假牙內外各面\n- 使用假牙清潔錠每天浸泡一次（約 15-30 分鐘）\n- 清潔口腔黏膜\n\n## 夜間保養\n\n- 睡前取下假牙，讓牙齦充分休息\n- 將假牙浸泡在清水或假牙保存液中\n- 避免乾燥，否則假牙可能變形','諾星編輯團隊', adminId]
  );

  await q(
    `INSERT INTO articles (slug, title, category, tags, summary, content, author, published, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8) ON CONFLICT (slug) DO NOTHING`,
    ['implant-vs-bridge','植牙 vs 牙橋：缺牙修復如何選擇？','假牙比較',['植牙','牙橋','缺牙','比較'],'缺牙了該選植牙還是牙橋？兩者各有優缺點，本文幫您釐清決策重點。','## 植牙優點\n\n- 不需要磨到鄰牙\n- 使用壽命長（可達 20 年以上）\n- 咀嚼功能接近天然牙\n\n## 牙橋優點\n\n- 費用相對較低\n- 療程較短（約 2-3 週）\n- 不需手術','諾星編輯團隊', adminId]
  );

  console.log('   ✅ 衛教文章建立完成\n');

  // ── 完成 ───────────────────────────────────────────────────
  console.log('🎉 所有示範資料建立完成！\n');
  console.log('═══════════════════════════════════════');
  console.log('📋 測試帳號一覽：');
  console.log('───────────────────────────────────────');
  console.log('SUPER_ADMIN  superadmin@novadent.com       / SuperAdmin123!');
  console.log('ADMIN        admin@novadent.com             / Admin@2026');
  console.log('CLINIC(台北) taipei-clinic@novadent.com    / Clinic@2026');
  console.log('CLINIC(台中) taichung-clinic@novadent.com  / Clinic@2026');
  console.log('CLINIC(高雄) kaohsiung-clinic@novadent.com / Clinic@2026');
  console.log('LAB(精準)    precision-lab@novadent.com    / Lab@2026');
  console.log('LAB(藝匠)    artisan-lab@novadent.com      / Lab@2026');
  console.log('MEMBER 1     member1@test.com               / Member@2026');
  console.log('MEMBER 2     member2@test.com               / Member@2026');
  console.log('MEMBER 3     member3@test.com               / Member@2026');
  console.log('═══════════════════════════════════════');

  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
