// Cases DTO — 案件建立、指派、製程節點更新的驗證規則
import {
  IsString, IsOptional, IsIn, IsUUID
} from 'class-validator';

// ── 建立案件（Clinic 用）─────────────────────────────────────
export class CreateCaseDto {
  @IsString()
  patientName: string;

  @IsIn(['FIXED', 'REMOVABLE', 'IMPLANT'])
  type: 'FIXED' | 'REMOVABLE' | 'IMPLANT';

  @IsString()
  @IsOptional()
  patientBirthday?: string;  // 病患生日 YYYY-MM-DD（防重名比對）

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  memberId?: string; // 選填，連結會員諮詢
}

// ── 指派牙技所 ────────────────────────────────────────────────
export class AssignLabDto {
  @IsUUID()
  labId: string;
}

// ── 更新製程節點（Lab 用）────────────────────────────────────
export class UpdateMfgStepDto {
  @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}
