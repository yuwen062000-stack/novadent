// Novadent 資料庫 Schema（Drizzle ORM）
// 對應開發說明書 V1.1 第四節資料模型
import {
  pgTable, uuid, varchar, text, boolean, timestamp,
  decimal, integer, pgEnum, jsonb, index
} from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', [
  'SUPER_ADMIN', 'ADMIN', 'CLINIC', 'LAB', 'MEMBER', 'INSURER'
]);

export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'DISABLED']);

export const partnerStatusEnum = pgEnum('partner_status', [
  'PENDING', 'ACTIVE', 'DISABLED'
]);

export const caseStatusEnum = pgEnum('case_status', [
  'RECOMMENDED', 'CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'
]);

export const caseTypeEnum = pgEnum('case_type', [
  'FIXED', 'REMOVABLE', 'IMPLANT'
]);

export const mfgStepStatusEnum = pgEnum('mfg_step_status', [
  'PENDING', 'IN_PROGRESS', 'COMPLETED'
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'CASE_UPDATE', 'SYSTEM', 'REMINDER'
]);

// ── users ────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  email:                varchar('email', { length: 255 }).notNull().unique(),
  passwordHash:         varchar('password_hash', { length: 255 }).notNull(),
  role:                 userRoleEnum('role').notNull(),
  name:                 varchar('name', { length: 100 }).notNull(),
  phone:                varchar('phone', { length: 20 }),
  status:               userStatusEnum('status').notNull().default('ACTIVE'),
  forceChangePassword:  boolean('force_change_password').notNull().default(false),
  parentId:             uuid('parent_id'),   // 子帳號關聯
  createdAt:            timestamp('created_at').notNull().defaultNow(),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
});

// ── password_reset_tokens ────────────────────────────────────
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token:     varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt:    timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── clinics ──────────────────────────────────────────────────
export const clinics = pgTable('clinics', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  userId:             uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:               varchar('name', { length: 100 }).notNull(),
  leadDoctorName:     varchar('lead_doctor_name', { length: 100 }).notNull(),
  phone:              varchar('phone', { length: 20 }).notNull(),
  email:              varchar('email', { length: 255 }).notNull(),
  city:               varchar('city', { length: 50 }).notNull(),
  district:           varchar('district', { length: 50 }),
  detailedAddress:    varchar('detailed_address', { length: 255 }),
  treatmentTypes:     text('treatment_types').array(),   // FIXED/REMOVABLE/IMPLANT
  services:           text('services').array(),           // 顯示用標籤
  acceptingReferrals: boolean('accepting_referrals').notNull().default(true),
  rating:             decimal('rating', { precision: 3, scale: 2 }),
  description:        text('description'),
  doctorTeam:         text('doctor_team').array(),
  coverPhotoUrl:      varchar('cover_photo_url', { length: 500 }),
  internalNotes:      text('internal_notes'),
  status:             partnerStatusEnum('status').notNull().default('PENDING'),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
});

// ── labs ────────────────────────────────────────────────────
export const labs = pgTable('labs', {
  id:                uuid('id').primaryKey().defaultRandom(),
  userId:            uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:              varchar('name', { length: 100 }).notNull(),
  leadTechnicianName: varchar('lead_technician_name', { length: 100 }).notNull(),
  phone:             varchar('phone', { length: 20 }).notNull(),
  email:             varchar('email', { length: 255 }).notNull(),
  city:              varchar('city', { length: 50 }).notNull(),
  detailedAddress:   varchar('detailed_address', { length: 255 }),
  acceptedCaseTypes: text('accepted_case_types').array(),
  specialties:       text('specialties').array(),
  coverPhotoUrl:     varchar('cover_photo_url', { length: 500 }),
  internalNotes:     text('internal_notes'),
  status:            partnerStatusEnum('status').notNull().default('PENDING'),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
  updatedAt:         timestamp('updated_at').notNull().defaultNow(),
});

// ── partner_links（診所 ↔ 牙技所配對）─────────────────────────
export const partnerLinks = pgTable('partner_links', {
  id:        uuid('id').primaryKey().defaultRandom(),
  clinicId:  uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  labId:     uuid('lab_id').notNull().references(() => labs.id, { onDelete: 'cascade' }),
  status:    partnerStatusEnum('status').notNull().default('ACTIVE'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── consultations（QA 問答諮詢）──────────────────────────────
export const consultations = pgTable('consultations', {
  id:              uuid('id').primaryKey().defaultRandom(),
  memberId:        uuid('member_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  answers:         jsonb('answers').notNull(),           // QA 答案 JSONB
  inferredCaseType: caseTypeEnum('inferred_case_type'),
  selectedCity:    varchar('selected_city', { length: 50 }),
  selectedDistrict: varchar('selected_district', { length: 50 }),
  summary:         text('summary'),
  status:          varchar('status', { length: 50 }).notNull().default('RECOMMENDED'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
});

// ── cases（案件）────────────────────────────────────────────
export const cases = pgTable('cases', {
  id:           uuid('id').primaryKey().defaultRandom(),
  clinicId:     uuid('clinic_id').notNull().references(() => clinics.id),
  labId:        uuid('lab_id').references(() => labs.id),
  memberId:     uuid('member_id').references(() => users.id),
  patientName:  varchar('patient_name', { length: 100 }).notNull(),
  type:         caseTypeEnum('type').notNull(),
  status:       caseStatusEnum('status').notNull().default('CREATED'),
  description:  text('description'),
  progress:     integer('progress').notNull().default(0),
  currentStage: varchar('current_stage', { length: 100 }),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
});

// ── mfg_steps（製程節點）─────────────────────────────────────
export const mfgSteps = pgTable('mfg_steps', {
  id:        uuid('id').primaryKey().defaultRandom(),
  caseId:    uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  name:      varchar('name', { length: 100 }).notNull(),
  order:     integer('order').notNull(),
  status:    mfgStepStatusEnum('status').notNull().default('PENDING'),
  note:      text('note'),
  photoUrl:  varchar('photo_url', { length: 500 }),
  updatedAt: timestamp('updated_at'),
  updatedBy: uuid('updated_by').references(() => users.id),
});

// ── notifications（通知）────────────────────────────────────
export const notifications = pgTable('notifications', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:      notificationTypeEnum('type').notNull().default('SYSTEM'),
  title:     varchar('title', { length: 200 }).notNull(),
  content:   text('content').notNull(),
  read:      boolean('read').notNull().default(false),
  relatedId: uuid('related_id'),  // 關聯的 case/consultation ID
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── articles（衛教文章）──────────────────────────────────────
export const articles = pgTable('articles', {
  id:          uuid('id').primaryKey().defaultRandom(),
  slug:        varchar('slug', { length: 200 }).notNull().unique(),
  title:       varchar('title', { length: 300 }).notNull(),
  category:    varchar('category', { length: 100 }).notNull(),
  tags:        text('tags').array(),
  summary:     text('summary'),
  content:     text('content').notNull(),
  author:      varchar('author', { length: 100 }).notNull(),
  coverUrl:    varchar('cover_url', { length: 500 }),
  metaTitle:   varchar('meta_title', { length: 200 }),
  metaDesc:    varchar('meta_desc', { length: 300 }),
  published:   boolean('published').notNull().default(false),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
  createdBy:   uuid('created_by').references(() => users.id),
});

// ── menu_config（選單管理）──────────────────────────────────
export const menuConfig = pgTable('menu_config', {
  id:           uuid('id').primaryKey().defaultRandom(),
  label:        varchar('label', { length: 100 }).notNull(),
  path:         varchar('path', { length: 200 }).notNull().default(''), // 父群組項目 path 為空字串
  roles:        text('roles').array().notNull().default([]),
  order:        integer('order').notNull().default(0),
  visible:      boolean('visible').notNull().default(true),
  menuType:     varchar('menu_type', { length: 20 }).notNull().default('PUBLIC'), // 'PUBLIC'=前台 | 'ADMIN'=後台
  parentId:     uuid('parent_id'),           // null=頂層，有值=子項目（父為群組）
  showInFooter: boolean('show_in_footer').notNull().default(false), // 是否顯示於 Footer 快速連結
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
  updatedBy:    uuid('updated_by').references(() => users.id),
});

// ── audit_logs（操作日誌）────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').references(() => users.id),
  action:     varchar('action', { length: 100 }).notNull(),  // LOGIN / RESET_PASSWORD / CREATE_CASE 等
  targetType: varchar('target_type', { length: 50 }),        // user / case / clinic 等
  targetId:   uuid('target_id'),
  detail:     jsonb('detail'),                                // 額外資訊
  ipAddress:  varchar('ip_address', { length: 50 }),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

// ── refresh_tokens（JWT Refresh Token）──────────────────────
export const refreshTokens = pgTable('refresh_tokens', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token:     varchar('token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── qa_questions（QA 問卷題目 — SuperAdmin 可編輯）─────────
export const qaQuestionTypeEnum = pgEnum('qa_question_type', [
  'single_choice', 'multiple_choice', 'text_input'
]);

export const qaQuestions = pgTable('qa_questions', {
  id:           integer('id').primaryKey().generatedAlwaysAsIdentity(),
  questionText: text('question_text').notNull(),
  questionType: qaQuestionTypeEnum('question_type').notNull().default('single_choice'),
  options:      jsonb('options'),  // [{value, label, score}, ...]
  orderIndex:   integer('order_index').notNull().default(0),
  category:     varchar('category', { length: 50 }),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
});

// ── clinic_recommendations（問診推薦結果）──────────────────
export const clinicRecommendations = pgTable('clinic_recommendations', {
  id:             uuid('id').primaryKey().defaultRandom(),
  consultationId: uuid('consultation_id').notNull().references(() => consultations.id, { onDelete: 'cascade' }),
  clinicId:       uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  score:          decimal('score', { precision: 5, scale: 2 }).notNull().default('0'),
  rank:           integer('rank').notNull().default(1),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
});

// ── system_settings（系統參數設定）────────────────────────
export const systemSettings = pgTable('system_settings', {
  id:          uuid('id').primaryKey().defaultRandom(),
  key:         varchar('key', { length: 100 }).notNull().unique(),
  value:       text('value'),
  encrypted:   boolean('encrypted').notNull().default(false),
  description: varchar('description', { length: 255 }),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
  updatedBy:   uuid('updated_by').references(() => users.id),
});

// ── site_images（網站圖片管理）────────────────────────────
export const siteImages = pgTable('site_images', {
  id:          uuid('id').primaryKey().defaultRandom(),
  page:        varchar('page', { length: 50 }).notNull(),
  position:    varchar('position', { length: 50 }).notNull(),
  imageUrl:    text('image_url'),
  altText:     varchar('alt_text', { length: 200 }),
  title:       varchar('title', { length: 200 }),
  textContent: text('text_content'),
  blockType:   varchar('block_type', { length: 20 }).notNull().default('image'),
  visible:     boolean('visible').notNull().default(true),
  sortOrder:   integer('sort_order').notNull().default(0),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
  updatedBy:   uuid('updated_by').references(() => users.id),
});

// ── videos（影音管理）─────────────────────────────────────
export const videos = pgTable('videos', {
  id:             uuid('id').primaryKey().defaultRandom(),
  title:          varchar('title', { length: 200 }).notNull(),
  description:    text('description'),
  videoUrl:       text('video_url').notNull(),
  thumbnailUrl:   text('thumbnail_url'),
  featuredOnHome: boolean('featured_on_home').notNull().default(false),
  isPublished:    boolean('is_published').notNull().default(true),
  sortOrder:      integer('sort_order').notNull().default(0),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
  createdBy:      uuid('created_by').references(() => users.id),
});

// ── page_contents（頁面內容管理）──────────────────────────
export const pageContents = pgTable('page_contents', {
  id:          uuid('id').primaryKey().defaultRandom(),
  key:         varchar('key', { length: 100 }).notNull().unique(),
  contentType: varchar('content_type', { length: 20 }).notNull().default('TEXT'),
  value:       text('value'),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
  updatedBy:   uuid('updated_by').references(() => users.id),
});

// ── mfg_step_templates（製程節點模板 — SuperAdmin 管理）────
export const mfgStepTemplates = pgTable('mfg_step_templates', {
  id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name:        varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  orderIndex:  integer('order_index').notNull().default(0),
  isDefault:   boolean('is_default').notNull().default(true),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
});
