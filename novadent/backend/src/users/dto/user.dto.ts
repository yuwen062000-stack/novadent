// Users DTO — 用戶建立與更新的資料驗證規則
import {
  IsEmail, IsString, IsOptional, IsIn, IsPhoneNumber, ValidateNested, IsObject
} from 'class-validator';
import { Type } from 'class-transformer';

// ── 建立診所附帶資料 ──────────────────────────────────────────
export class ClinicDataDto {
  @IsString()
  name: string;

  @IsString()
  leadDoctorName: string;

  @IsString()
  city: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  description?: string;
}

// ── 建立牙技所附帶資料 ────────────────────────────────────────
export class LabDataDto {
  @IsString()
  name: string;

  @IsString()
  leadTechnicianName: string;

  @IsString()
  city: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;
}

// ── 建立用戶（Admin 用）──────────────────────────────────────
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsIn(['CLINIC', 'LAB'])
  role: 'CLINIC' | 'LAB';

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
