// Consultations Service — QA 諮詢與診所推薦核心邏輯
import {
  Injectable, Inject, NotFoundException, ForbiddenException
} from '@nestjs/common';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { consultations, clinics, auditLogs } from '../database/schema';
import { CreateConsultationDto } from './dto/consultation.dto';

@Injectable()
export class ConsultationsService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  // ── 寫入操作日誌 ──────────────────────────────────────────
  private async writeAuditLog(
    userId: string,
    action: string,
    targetId?: string,
    detail?: any,
  ) {
    await this.db.insert(auditLogs).values({
      userId,
      action,
      targetType: 'consultation',
      targetId,
      detail: detail ?? null,
    } as any).catch(() => {});
  }

  // ── 建立 QA 諮詢（Member 用）─────────────────────────────
  async create(memberId: string, dto: CreateConsultationDto) {
    // 從 q1Answer 推斷 inferred_case_type
    const inferredCaseType = dto.q1Answer as 'FIXED' | 'REMOVABLE' | 'IMPLANT';

    const [consultation] = await this.db.insert(consultations).values({
      memberId,
      answers:          dto.answers,
      inferredCaseType,
      selectedCity:     dto.q2City,
      selectedDistrict: dto.q2District,
      summary:          dto.summary,
      status:           'RECOMMENDED',
    } as any).returning();

    await this.writeAuditLog(memberId, 'CREATE_CONSULTATION', consultation.id);

    return consultation;
  }

  // ── 會員取自己的諮詢記錄 ─────────────────────────────────
  async findByMember(memberId: string) {
    return this.db
      .select()
      .from(consultations)
      .where(eq(consultations.memberId, memberId))
      .orderBy(desc(consultations.createdAt));
  }

  // ── 取單一諮詢（確認歸屬會員）───────────────────────────
  async findById(consultationId: string, memberId: string) {
    const [consultation] = await this.db
      .select()
      .from(consultations)
      .where(and(
        eq(consultations.id,       consultationId),
        eq(consultations.memberId, memberId),
      ))
      .limit(1);

    if (!consultation) throw new NotFoundException('諮詢記錄不存在');
    return consultation;
  }

  // ── 依 QA 答案推薦診所 ───────────────────────────────────
  // 排序：1. 地區完全符合 2. rating DESC 3. createdAt ASC，最多 10 筆
  async recommend(consultationId: string, memberId: string) {
    // 確認諮詢記錄存在且屬於該會員
    const consultation = await this.findById(consultationId, memberId);

    // 基礎條件：ACTIVE 狀態 + 接受轉介
    const conditions: any[] = [
      eq(clinics.status,            'ACTIVE'),
      eq(clinics.acceptingReferrals, true),
    ];

    // 篩選治療類型（若有推斷類型）
    // treatmentTypes 是 text array，用 raw SQL 判斷是否包含該類型
    if (consultation.inferredCaseType) {
      conditions.push(
        sql`${clinics.treatmentTypes} @> ARRAY[${consultation.inferredCaseType}]::text[]`
      );
    }

    // 篩選縣市（若有填）
    if (consultation.selectedCity) {
      conditions.push(eq(clinics.city, consultation.selectedCity));
    }

    const whereClause = and(...conditions);

    // 查詢：地區完全符合者優先（selectedDistrict），再依 rating DESC、createdAt ASC
    const rows = await this.db
      .select({
        id:                 clinics.id,
        name:               clinics.name,
        city:               clinics.city,
        district:           clinics.district,
        treatmentTypes:     clinics.treatmentTypes,
        services:           clinics.services,
        acceptingReferrals: clinics.acceptingReferrals,
        rating:             clinics.rating,
        description:        clinics.description,
        coverPhotoUrl:      clinics.coverPhotoUrl,
        leadDoctorName:     clinics.leadDoctorName,
        // 地區完全符合得分（district 相符 = 1，否則 0）
        districtMatch: consultation.selectedDistrict
          ? sql<number>`CASE WHEN ${clinics.district} = ${consultation.selectedDistrict} THEN 1 ELSE 0 END`
          : sql<number>`0`,
      })
      .from(clinics)
      .where(whereClause)
      .orderBy(
        // 1. 地區符合度（DESC）
        sql`CASE WHEN ${clinics.district} = ${consultation.selectedDistrict ?? ''} THEN 1 ELSE 0 END DESC`,
        // 2. 評分（DESC，NULL 排最後）
        sql`${clinics.rating} DESC NULLS LAST`,
        // 3. 建立時間（ASC，較早的較前面）
        asc(clinics.createdAt),
      )
      .limit(10);

    return {
      consultationId,
      inferredCaseType: consultation.inferredCaseType,
      city:             consultation.selectedCity,
      district:         consultation.selectedDistrict,
      recommendations:  rows,
    };
  }
}
