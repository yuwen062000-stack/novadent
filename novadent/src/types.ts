/**
 * Novadent Case Status Machine
 */
export enum CaseStatus {
  RECOMMENDED = 'RECOMMENDED', // Member got clinic recommendation
  CREATED = 'CREATED',         // Clinic created the case
  ASSIGNED = 'ASSIGNED',       // Clinic assigned to a Lab
  ACCEPTED = 'ACCEPTED',       // Lab accepted the case
  IN_PROGRESS = 'IN_PROGRESS', // Lab is working on it
  COMPLETED = 'COMPLETED'      // Clinic confirmed completion
}

export type UserRole = 'GUEST' | 'MEMBER' | 'CLINIC' | 'LAB' | 'ADMIN' | 'SUPER_ADMIN' | 'INSURER';

export enum PartnerStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED'
}

export type CaseType = 'FIXED' | 'REMOVABLE' | 'IMPLANT';
export type MfgStepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface MfgStep {
  id: string;
  name: string;
  status: MfgStepStatus;
  updatedAt?: string;
  note?: string;
  photoUrl?: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  content: string;
  author: string;
  publishedAt: string;
  coverUrl: string;
  metaTitle?: string;
  metaDesc?: string;
}

export const ARTICLE_CATEGORIES = ['假牙百科', '口腔護理', '診所指南', '最新消息'];

export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  category: string;
  publishedAt: string;
}

export const VIDEO_CATEGORIES = ['衛教知識', '平台介紹', '最新消息'];

export interface Case {
  id: string;
  patientName: string; // Masked for Member
  clinicName: string;
  labName?: string;
  status: CaseStatus;
  type: CaseType;
  createdAt: string;
  updatedAt: string;
  description: string;
  progress: number;
  currentStage: string;
  mfgSteps: MfgStep[];
  steps: CaseStep[];
}

export interface Clinic {
  id: string;
  name: string;
  leadDoctorName: string;
  phone: string;
  email: string;
  city: string;
  detailedAddress: string;
  area: string; // Legacy field, keeping for compatibility
  rating: number;
  description: string;
  services: string[];
  doctorTeam: string[];
  coverPhoto: string;
  status: PartnerStatus;
  internalNotes: string;
  isPartner?: boolean; // Legacy field
}

export interface Lab {
  id: string;
  name: string;
  leadTechnicianName: string;
  phone: string;
  email: string;
  city: string;
  detailedAddress: string;
  specialties: string[];
  partnerClinics: string[]; // Clinic IDs
  coverPhoto: string;
  status: PartnerStatus;
  internalNotes: string;
  specialty: string; // Legacy field
  isPartner?: boolean; // Legacy field
}

export interface Member {
  id: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
}

export interface HomeConfig {
  heroBannerUrl: string;
}

export interface SubAccount {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface CaseStep {
  status: CaseStatus;
  label: string;
  timestamp: string;
  completed: boolean;
  note?: string;
  photoUrl?: string;
}

export interface Consultation {
  id: string;
  createdAt: string;
  summary: string;
  status: 'RECOMMENDED' | 'CASE_CREATED';
}

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  'FIXED': '固定式假牙',
  'REMOVABLE': '活動式假牙',
  'IMPLANT': '植牙牙冠'
};

export const STATUS_LABELS: Record<CaseStatus, string> = {
  [CaseStatus.RECOMMENDED]: '診所推薦',
  [CaseStatus.CREATED]: '案件已建立',
  [CaseStatus.ASSIGNED]: '已指派牙技所',
  [CaseStatus.ACCEPTED]: '牙技所已接單',
  [CaseStatus.IN_PROGRESS]: '假牙製作中',
  [CaseStatus.COMPLETED]: '製作完成'
};

export const STATUS_COLORS: Record<CaseStatus, string> = {
  [CaseStatus.RECOMMENDED]: 'bg-blue-100 text-blue-700',
  [CaseStatus.CREATED]: 'bg-slate-100 text-slate-700',
  [CaseStatus.ASSIGNED]: 'bg-amber-100 text-amber-700',
  [CaseStatus.ACCEPTED]: 'bg-indigo-100 text-indigo-700',
  [CaseStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-900',
  [CaseStatus.COMPLETED]: 'bg-navy-700 text-white'
};

// ── M-01 Auth ──────────────────────────────────────────────

/** 已登入使用者資訊（JWT Payload 對應） */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Admin 代重設密碼後為 true，強制使用者下次登入修改 */
  forceChangePassword: boolean;
}

// ── C-12 MenuManager ──────────────────────────────────────

/** 選單項目（前台導覽列 + 後台側選單共用） */
export interface MenuItem {
  id: string;
  label: string;
  path: string;
  /** 哪些角色可看到此選單項目 */
  roles: UserRole[];
  order: number;
  visible: boolean;
}
