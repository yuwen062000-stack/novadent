// Labs Service — 牙技所資料管理核心邏輯
import {
  Injectable, Inject, NotFoundException
} from '@nestjs/common';
import { eq, ilike, and, sql } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { labs, auditLogs } from '../database/schema';
import { CreateLabDto, UpdateLabDto, UpdateLabStatusDto } from './dto/lab.dto';

// 牙技所公開欄位（不含 internalNotes）
const PUBLIC_FIELDS = {
  id:                labs.id,
  name:              labs.name,
  leadTechnicianName: labs.leadTechnicianName,
  phone:             labs.phone,
  email:             labs.email,
  city:              labs.city,
  detailedAddress:   labs.detailedAddress,
  acceptedCaseTypes: labs.acceptedCaseTypes,
  specialties:       labs.specialties,
  coverPhotoUrl:     labs.coverPhotoUrl,
  status:            labs.status,
  userId:            labs.userId,
  createdAt:         labs.createdAt,
  updatedAt:         labs.updatedAt,
};

// 牙技所完整欄位（含 internalNotes，Admin 專用）
const ADMIN_FIELDS = {
  ...PUBLIC_FIELDS,
  internalNotes: labs.internalNotes,
};

@Injectable()
export class LabsService {
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
      targetType: 'lab',
      targetId,
      detail: detail ?? null,
    } as any).catch(() => {});
  }

  // ── 公開牙技所列表（只回傳 ACTIVE，PUBLIC_FIELDS）───────
  async findAllPublic(query: {
    city?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page     = query.page     ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset   = (page - 1) * pageSize;

    const conditions: any[] = [eq(labs.status, 'ACTIVE')];
    if (query.city)   conditions.push(eq(labs.city, query.city));
    if (query.search) conditions.push(ilike(labs.name, `%${query.search}%`));

    const whereClause = and(...conditions);

    const rows = await this.db
      .select(PUBLIC_FIELDS as any)
      .from(labs)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(labs)
      .where(whereClause);

    return { data: rows, total: count, page, pageSize };
  }

  // ── 分頁查詢牙技所列表（Admin，含所有狀態）──────────────
  async findAll(query: {
    status?: string;
    city?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page     = query.page     ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset   = (page - 1) * pageSize;

    const conditions: any[] = [];
    if (query.status) conditions.push(eq(labs.status, query.status as any));
    if (query.city)   conditions.push(eq(labs.city, query.city));
    if (query.search) conditions.push(ilike(labs.name, `%${query.search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select(ADMIN_FIELDS as any)
      .from(labs)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(labs)
      .where(whereClause);

    return { data: rows, total: count, page, pageSize };
  }

  // ── 取單一牙技所（Admin 含 internalNotes）────────────────
  async findById(id: string, isAdmin = false) {
    const fields = isAdmin ? ADMIN_FIELDS : PUBLIC_FIELDS;

    const [lab] = await this.db
      .select(fields as any)
      .from(labs)
      .where(eq(labs.id, id))
      .limit(1);

    if (!lab) throw new NotFoundException('牙技所不存在');
    return lab;
  }

  // ── 牙技所用戶取自己的資料 ───────────────────────────────
  async findByUserId(userId: string) {
    const [lab] = await this.db
      .select(ADMIN_FIELDS as any)
      .from(labs)
      .where(eq(labs.userId, userId))
      .limit(1);

    if (!lab) throw new NotFoundException('找不到對應的牙技所資料');
    return lab;
  }

  // ── Admin 新增牙技所 ───────────────────────────────────────
  async adminCreate(dto: CreateLabDto, adminId: string) {
    const [created] = await this.db.insert(labs).values({
      ...dto,
      userId: adminId,
      status: 'ACTIVE',
    } as any).returning();

    await this.writeAuditLog(adminId, 'CREATE_LAB', created.id, { name: dto.name });
    return created;
  }

  // ── Admin 刪除牙技所 ──────────────────────────────────────
  async adminDelete(id: string, adminId: string) {
    const [existing] = await this.db
      .select({ id: labs.id, name: labs.name })
      .from(labs)
      .where(eq(labs.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('牙技所不存在');

    await this.db.delete(labs).where(eq(labs.id, id));
    await this.writeAuditLog(adminId, 'DELETE_LAB', id, { name: existing.name });
    return { success: true };
  }

  // ── 更新牙技所資料 ───────────────────────────────────────
  async update(id: string, dto: UpdateLabDto, userId: string) {
    const [existing] = await this.db
      .select({ id: labs.id })
      .from(labs)
      .where(eq(labs.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('牙技所不存在');

    await this.db.update(labs)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(eq(labs.id, id));

    await this.writeAuditLog(userId, 'UPDATE_LAB', id, { changes: dto });

    return this.findById(id, true);
  }

  // ── Admin 審核牙技所狀態 ─────────────────────────────────
  async updateStatus(id: string, dto: UpdateLabStatusDto, adminId: string) {
    const [existing] = await this.db
      .select({ id: labs.id, status: labs.status })
      .from(labs)
      .where(eq(labs.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('牙技所不存在');

    const updateData: any = {
      status:    dto.status,
      updatedAt: new Date(),
    };
    if (dto.internalNotes !== undefined) {
      updateData.internalNotes = dto.internalNotes;
    }

    await this.db.update(labs)
      .set(updateData as any)
      .where(eq(labs.id, id));

    await this.writeAuditLog(adminId, 'UPDATE_LAB_STATUS', id, {
      oldStatus: existing.status,
      newStatus: dto.status,
    });

    return this.findById(id, true);
  }
}
