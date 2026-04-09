// Consultations DTO — QA 諮詢建立的驗證規則
import { IsObject, IsString, IsOptional } from 'class-validator';

// ── 建立 QA 諮詢 ──────────────────────────────────────────────
export class CreateConsultationDto {
  @IsObject()
  answers: Record<string, any>; // QA 完整答案 JSONB 存入

  // q1Answer 不強制 @IsIn，避免後台 QA 問題選項值不同時 400 失敗
  // service 層會自行 fallback 到 'FIXED'
  @IsString()
  @IsOptional()
  q1Answer?: string; // 想處理的假牙類型

  @IsString()
  @IsOptional()
  q2City?: string; // 偏好縣市（選填，未填則不過濾）

  @IsString()
  @IsOptional()
  q2District?: string; // 偏好行政區（選填）

  @IsString()
  @IsOptional()
  summary?: string; // 補充說明
}
