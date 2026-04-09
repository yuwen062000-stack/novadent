// Consultations Service — QA 諮詢與診所推薦核心邏輯
import {
  Injectable, Inject, NotFoundException, ForbiddenException
} from '@nestjs/common';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { consultations, clinics, auditLogs, users } from '../database/schema';
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
    // 從 q1Answer 推斷 inferred_case_type，不在清單內則 fallback null（不過濾類型）
    const validTypes = ['FIXED', 'REMOVABLE', 'IMPLANT'];
    const inferredCaseType = validTypes.includes(dto.q1Answer ?? '')
      ? (dto.q1Answer as 'FIXED' | 'REMOVABLE' | 'IMPLANT')
      : null;

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

  // ── 會員取自己的諮詢記錄（含全域流水號，與 Admin 看到的 C-001 編號一致）───
  async findByMember(memberId: string) {
    // 用 CTE + ROW_NUMBER() OVER (全部記錄按時間排序) 產生全域序號
    const rows = await this.db.execute<{
      id: string;
      member_id: string;
      answers: any;
      inferred_case_type: string | null;
      selected_city: string | null;
      selected_district: string | null;
      summary: string | null;
      status: string;
      created_at: string;
      consultation_number: number;
    }>(sql`
      WITH numbered AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS consultation_number
        FROM consultations
      )
      SELECT * FROM numbered
      WHERE member_id = ${memberId}
      ORDER BY created_at DESC
    `);
    return rows;
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

  // ── Admin：取全部諮詢記錄（含會員資訊 + ROW_NUMBER 流水號）────
  // 用 raw SQL 加 ROW_NUMBER()，不改動 DB schema
  async findAllForAdmin(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    // 取總筆數
    const [{ count }] = await this.db.execute<{ count: string }>(
      sql`SELECT COUNT(*)::text AS count FROM consultations`
    );

    // 取分頁資料，JOIN users 取 email/name，加 row_number 流水號
    const rows = await this.db.execute<{
      id: string;
      consultation_number: number;
      member_id: string;
      member_email: string;
      member_name: string;
      answers: any;
      inferred_case_type: string | null;
      selected_city: string | null;
      selected_district: string | null;
      summary: string | null;
      status: string;
      created_at: Date;
    }>(sql`
      SELECT
        c.id,
        ROW_NUMBER() OVER (ORDER BY c.created_at ASC) AS consultation_number,
        c.member_id,
        u.email AS member_email,
        u.name  AS member_name,
        c.answers,
        c.inferred_case_type,
        c.selected_city,
        c.selected_district,
        c.summary,
        c.status,
        c.created_at
      FROM consultations c
      LEFT JOIN users u ON c.member_id = u.id
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    return {
      total: parseInt(count, 10),
      page,
      limit,
      data: rows,
    };
  }

  // ── Admin：取單一諮詢記錄（含推薦診所，供 Admin 查看）────────
  async findByIdForAdmin(consultationId: string) {
    const [consultation] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);

    if (!consultation) throw new NotFoundException('諮詢記錄不存在');

    // 同時撈推薦結果（複用 recommend 邏輯，但跳過 memberId 驗證）
    const conditions: any[] = [
      eq(clinics.status,            'ACTIVE'),
      eq(clinics.acceptingReferrals, true),
    ];
    if (consultation.inferredCaseType) {
      conditions.push(
        sql`${clinics.treatmentTypes} @> ARRAY[${consultation.inferredCaseType}]::text[]`
      );
    }
    if (consultation.selectedCity) {
      conditions.push(eq(clinics.city, consultation.selectedCity));
    }

    const recommendations = await this.db
      .select({
        id:            clinics.id,
        name:          clinics.name,
        city:          clinics.city,
        district:      clinics.district,
        rating:        clinics.rating,
        coverPhotoUrl: clinics.coverPhotoUrl,
      })
      .from(clinics)
      .where(and(...conditions))
      .orderBy(
        sql`CASE WHEN ${clinics.district} = ${consultation.selectedDistrict ?? ''} THEN 1 ELSE 0 END DESC`,
        sql`${clinics.rating} DESC NULLS LAST`,
        asc(clinics.createdAt),
      )
      .limit(10);

    return { ...consultation, recommendations };
  }
}
