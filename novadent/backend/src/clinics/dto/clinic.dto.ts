// Clinics DTO — 診所資料更新與狀態審核的驗證規則
import { IsString, IsOptional, IsBoolean, IsArray, IsIn, IsEmail } from 'class-validator';

// ── 診所公開資料更新（Clinic 角色或 Admin 皆可用）────────────
export class UpdateClinicDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  leadDoctorName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  detailedAddress?: string;

  @IsArray()
  @IsOptional()
  treatmentTypes?: string[]; // FIXED / REMOVABLE / IMPLANT

  @IsArray()
  @IsOptional()
  services?: string[];

  @IsBoolean()
  @IsOptional()
  acceptingReferrals?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  doctorTeam?: string[];

  @IsString()
  @IsOptional()
  coverPhotoUrl?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string; // 只有 Admin 才能寫入，Controller 層要控制
}

// ── Admin 更新診所狀態（審核用）──────────────────────────────
export class UpdateClinicStatusDto {
  @IsIn(['PENDING', 'ACTIVE', 'DISABLED'])
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';

  @IsString()
  @IsOptional()
  internalNotes?: string;
}
