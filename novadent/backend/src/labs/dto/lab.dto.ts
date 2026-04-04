// Labs DTO — 牙技所資料更新與狀態審核的驗證規則
import { IsString, IsOptional, IsArray, IsIn, IsEmail } from 'class-validator';

// ── 牙技所資料更新（Lab 角色或 Admin 皆可用）──────────────────
export class UpdateLabDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  leadTechnicianName?: string;

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
  detailedAddress?: string;

  @IsArray()
  @IsOptional()
  acceptedCaseTypes?: string[]; // FIXED / REMOVABLE / IMPLANT

  @IsArray()
  @IsOptional()
  specialties?: string[];

  @IsString()
  @IsOptional()
  coverPhotoUrl?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string; // 只有 Admin 才能更新，Controller 層控制
}

// ── Admin 審核牙技所狀態 ──────────────────────────────────────
export class UpdateLabStatusDto {
  @IsIn(['PENDING', 'ACTIVE', 'DISABLED'])
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';

  @IsString()
  @IsOptional()
  internalNotes?: string;
}
