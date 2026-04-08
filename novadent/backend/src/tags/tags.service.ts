// Tags Service — 服務標籤管理（SuperAdmin 新增/編輯/刪除，診所/牙技所自選）
// targetType: 'CLINIC'=診所專用, 'LAB'=牙技所專用, 'ALL'=通用
import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq, and, or, asc } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { clinicTags } from '../database/schema';

@Injectable()
export class TagsService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  // ── 取 tag 清單 ──────────────────────────────────────────
  // isActiveOnly=true：只回傳啟用中的（公開端點用）
  // target：'CLINIC' 或 'LAB'，會回傳該類型 + ALL 的 tag
  async findAll(isActiveOnly = false, target?: string) {
    const conditions: any[] = [];

    if (isActiveOnly) {
      conditions.push(eq(clinicTags.isActive, true));
    }

    // 按適用對象過濾：指定 CLINIC → 回傳 CLINIC + ALL；指定 LAB → 回傳 LAB + ALL
    if (target === 'CLINIC' || target === 'LAB') {
      conditions.push(
        or(eq(clinicTags.targetType, target), eq(clinicTags.targetType, 'ALL'))
      );
    }

    if (conditions.length > 0) {
      return this.db
        .select()
        .from(clinicTags)
        .where(and(...conditions))
        .orderBy(asc(clinicTags.sortOrder), asc(clinicTags.name));
    }

    return this.db
      .select()
      .from(clinicTags)
      .orderBy(asc(clinicTags.sortOrder), asc(clinicTags.name));
  }

  // ── 新增 tag ───────────────────────────────────────────────
  async create(name: string, sortOrder = 0, targetType = 'ALL') {
    const existing = await this.db
      .select({ id: clinicTags.id })
      .from(clinicTags)
      .where(eq(clinicTags.name, name.trim()))
      .limit(1);
    if (existing.length > 0) throw new ConflictException('此 Tag 名稱已存在');

    const validTarget = ['CLINIC', 'LAB', 'ALL'].includes(targetType) ? targetType : 'ALL';
    const [tag] = await this.db.insert(clinicTags).values({
      name: name.trim(),
      sortOrder,
      targetType: validTarget,
    } as any).returning();
    return tag;
  }

  // ── 更新 tag 名稱 / 排序 / 啟用狀態 / 適用對象 ──────────
  async update(id: string, dto: { name?: string; sortOrder?: number; isActive?: boolean; targetType?: string }) {
    const [existing] = await this.db
      .select()
      .from(clinicTags)
      .where(eq(clinicTags.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Tag 不存在');

    const setData: any = {};
    if (dto.name      !== undefined) setData.name      = dto.name.trim();
    if (dto.sortOrder !== undefined) setData.sortOrder  = dto.sortOrder;
    if (dto.isActive  !== undefined) setData.isActive   = dto.isActive;
    if (dto.targetType !== undefined && ['CLINIC', 'LAB', 'ALL'].includes(dto.targetType)) {
      setData.targetType = dto.targetType;
    }

    const [updated] = await this.db.update(clinicTags)
      .set(setData)
      .where(eq(clinicTags.id, id))
      .returning();
    return updated;
  }

  // ── 刪除 tag ───────────────────────────────────────────────
  async remove(id: string) {
    const [existing] = await this.db
      .select()
      .from(clinicTags)
      .where(eq(clinicTags.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Tag 不存在');
    await this.db.delete(clinicTags).where(eq(clinicTags.id, id));
    return { success: true };
  }
}
