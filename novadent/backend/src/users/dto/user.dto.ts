// Users DTO — 用戶建立與更新的資料驗證規則
import {
  IsEmail, IsString, IsOptional, IsIn, IsPhoneNumber, ValidateNested, IsObject
} from 'class-validator';
import { Type } from 'class-transformer';

// ── 建立診所附帶資料 ──────────────────────────────────────────
export class ClinicDataDto {
  @IsString()
  name: string;  // 診所名稱（必填）

  @IsString()
  phone: string; // 電話（必填）

  @IsString()
  @IsOptional()
  leadDoctorName?: string; // 負責醫師（選填）

  @IsString()
  @IsOptional()
  city?: string; // 城市（選填）

  @IsEmail()
  @IsOptional()
  email?: string; // Email（選填，預設繼承帳號 email）

  @IsString()
  @IsOptional()
  description?: string;
}

// ── 建立牙技所附帶資料 ────────────────────────────────────────
export class LabDataDto {
  @IsString()
  name: string;  // 牙技所名稱（必填）

  @IsString()
  phone: string; // 電話（必填）

  @IsString()
  @IsOptional()
  leadTechnicianName?: string; // 主任技師（選填）

  @IsString()
  @IsOptional()
  city?: string; // 城市（選填）

  @IsEmail()
  @IsOptional()
  email?: string; // Email（選填）
}

// ── 建立用戶（Admin 用）──────────────────────────────────────
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  // 允許所有角色（CLINIC/LAB/ADMIN/MEMBER/INSURER）
  @IsString()
  role: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @ValidateNested()
  @Type(() => ClinicDataDto)
  @IsOptional()
  clinicData?: ClinicDataDto;

  @ValidateNested()
  @Type(() => LabDataDto)
  @IsOptional()
  labData?: LabDataDto;
}

// ── 更新用戶資料 ──────────────────────────────────────────────
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

// ── 建立子帳號 ────────────────────────────────────────────────
export class CreateSubAccountDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
