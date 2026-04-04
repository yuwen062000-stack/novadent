// Consultations DTO — QA 諮詢建立的驗證規則
import { IsObject, IsString, IsOptional, IsIn } from 'class-validator';

// ── 建立 QA 諮詢 ──────────────────────────────────────────────
export class CreateConsultationDto {
  @IsObject()
  answers: Record<string, any>; // QA 完整答案 JSONB 存入

  @IsIn(['FIXED', 'REMOVABLE', 'IMPLANT'])
  q1Answer: 'FIXED' | 'REMOVABLE' | 'IMPLANT'; // 想處理的類型

  @IsString()
  q2City: string; // 偏好縣市

  @IsString()
  @IsOptional()
  q2District?: string; // 偏好行政區（選填）

  @IsString()
  @IsOptional()
  summary?: string; // 補充說明
}
