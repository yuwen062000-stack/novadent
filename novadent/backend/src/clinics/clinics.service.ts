// Clinics Service — 診所資料管理核心邏輯
import {
  Injectable, Inject, NotFoundException, ForbiddenException, ConflictException
} from '@nestjs/common';
import { eq, ilike, and, sql, inArray } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { clinics, auditLogs, users } from '../database/schema';
import { CreateClinicDto, UpdateClinicDto, UpdateClinicStatusDto } from './dto/clinic.dto';

// 診所公開欄位（不含 internalNotes）
const PUBLIC_FIELDS = {
  id:                 clinics.id,
  name:               clinics.name,
  leadDoctorName:     clinics.leadDoctorName,
  phone:              clinics.phone,
  email:              clinics.email,
  city:               clinics.city,
  district:           clinics.district,
  detailedAddress:    clinics.detailedAddress,
  treatmentTypes:     clinics.treatmentTypes,
  services:           clinics.services,
  acceptingReferrals: clinics.acceptingReferrals,
  rating:             clinics.rating,
  description:        clinics.description,
  doctorTeam:         clinics.doctorTeam,
  coverPhotoUrl:      clinics.coverPhotoUrl,
  status:             clinics.status,
  userId:             clinics.userId,
  createdAt:          clinics.createdAt,
  updatedAt:          clinics.updatedAt,
};

// 診所完整欄位（含 internalNotes，Admin 專用）
const ADMIN_FIELDS = {
  ...PUBLIC_FIELDS,
  internalNotes: clinics.internalNotes,
};

@Injectable()
export class ClinicsService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  // ── 寫入操作日誌 ──────────────────────────────────────────
  private async writeAuditLog(
    userId: string | null,
    action: string,
    targetId?: string,
    detail?: any,
  ) {
    await this.db.insert(auditLogs).values({
      userId,
      action,
      targetType: 'clinic',
      targetId,
      detail: detail ?? null,
    } as any).catch(() => {});
  }

  // ── 公開診所列表（只回傳 ACTIVE，支援 city/type 篩選）────
  async findAll(query: {
    status?: string;
    city?: string | string[];
    search?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }, isAdmin = false) {
    const page     = query.page     ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset   = (page - 1) * pageSize;

    const conditions: any[] = [];

    // 公開 API 僅顯示 ACTIVE 診所
    if (!isAdmin) conditions.push(eq(clinics.status, 'ACTIVE'));
    else if (query.status) conditions.push(eq(clinics.status, query.status as any));

    // 支援單一或多個縣市篩選（前台多複選）
    if (query.city) {
      const cities = Array.isArray(query.city) ? query.city : [query.city];
      conditions.push(inArray(clinics.city, cities));
    }
    if (query.search) conditions.push(ilike(clinics.name, `%${query.search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const fields = isAdmin ? ADMIN_FIELDS : PUBLIC_FIELDS;

    const rows = await this.db
      .select(fields as any)
      .from(clinics)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(clinics)
      .where(whereClause);

    return { data: rows, total: count, page, pageSize };
  }

  // ── 公開取單一診所（internalNotes 依 isAdmin 過濾）────────
  async findById(id: string, isAdmin = false) {
    const fields = isAdmin ? ADMIN_FIELDS : PUBLIC_FIELDS;

    const [clinic] = await this.db
      .select(fields as any)
      .from(clinics)
      .where(eq(clinics.id, id))
      .limit(1);

    if (!clinic) throw new NotFoundException('診所不存在');

    // 公開 API 只顯示 ACTIVE 診所
    if (!isAdmin && (clinic as any).status !== 'ACTIVE') {
      throw new NotFoundException('診所不存在');
    }

    return clinic;
  }

  // ── 診所用戶取自己的資料（含 internalNotes）──────────────
  // 支援子帳號：若 userId 找不到對應診所，查詢 parentId 再試一次
  async findByUserId(userId: string) {
    let [clinic] = await this.db
      .select(ADMIN_FIELDS as any)
      .from(clinics)
      .where(eq(clinics.userId, userId))
      .limit(1);

    if (!clinic) {
      // 子帳號場景：用 parentId 查父帳號的診所
      const [user] = await this.db
        .select({ parentId: users.parentId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user?.parentId) {
        [clinic] = await this.db
          .select(ADMIN_FIELDS as any)
          .from(clinics)
          .where(eq(clinics.userId, user.parentId))
          .limit(1);
      }
    }

    if (!clinic) throw new NotFoundException('找不到對應的診所資料');
    return clinic;
  }

  // ── 更新診所資料 ─────────────────────────────────────────
  async update(id: string, dto: UpdateClinicDto, userId: string) {
    // 確認診所存在
    const [existing] = await this.db
      .select({ id: clinics.id })
      .from(clinics)
      .where(eq(clinics.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('診所不存在');

    await this.db.update(clinics)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(eq(clinics.id, id));

    await this.writeAuditLog(userId, 'UPDATE_CLINIC', id, { changes: dto });

    return this.findById(id, true);
  }

  // ── Admin 新增診所 ─────────────────────────────────────────
  // 若 dto.userId 有填入（對應的 CLINIC 帳號 ID），優先使用；否則退回 adminId
  async adminCreate(dto: CreateClinicDto, adminId: string) {
    const { userId: dtoUserId, ...rest } = dto as any;
    const [created] = await this.db.insert(clinics).values({
      ...rest,
      userId: dtoUserId || adminId,
      status: 'ACTIVE',
    } as any).returning();

    await this.writeAuditLog(adminId, 'CREATE_CLINIC', created.id, { name: dto.name });
    return created;
  }

  // ── Admin 更新診所資料（可改 internalNotes）──────────────
  async adminUpdate(id: string, dto: UpdateClinicDto, adminId: string) {
    return this.update(id, dto, adminId);
  }

  // ── Admin 刪除診所 ─────────────────────────────────────────
  async adminDelete(id: string, adminId: string) {
    const [existing] = await this.db
      .select({ id: clinics.id, name: clinics.name })
      .from(clinics)
      .where(eq(clinics.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('診所不存在');

    await this.db.delete(clinics).where(eq(clinics.id, id));
    await this.writeAuditLog(adminId, 'DELETE_CLINIC', id, { name: existing.name });
    return { success: true };
  }

  // ── Admin 審核診所狀態 ───────────────────────────────────
  async updateStatus(id: string, dto: UpdateClinicStatusDto, adminId: string) {
    const [existing] = await this.db
      .select({ id: clinics.id, status: clinics.status })
      .from(clinics)
      .where(eq(clinics.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('診所不存在');

    const updateData: any = {
      status:    dto.status,
      updatedAt: new Date(),
    };
    if (dto.internalNotes !== undefined) {
      updateData.internalNotes = dto.internalNotes;
    }

    await this.db.update(clinics)
      .set(updateData as any)
      .where(eq(clinics.id, id));

    await this.writeAuditLog(adminId, 'UPDATE_CLINIC_STATUS', id, {
      oldStatus: existing.status,
      newStatus: dto.status,
    });

    return this.findById(id, true);
  }
}
