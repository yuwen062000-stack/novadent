// SystemOptions Service — 系統選項管理（文章分類、案件類型等 SuperAdmin 可配置項目）
// group 欄位區分不同類型：'ARTICLE_CATEGORY', 'CASE_TYPE' 等
import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { systemOptions } from '../database/schema';

@Injectable()
export class SystemOptionsService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  // ── 依 group 取選項（isActiveOnly=true 只回傳啟用中的）──
  async findByGroup(group: string, isActiveOnly = false) {
    const conditions: any[] = [eq(systemOptions.group, group)];
    if (isActiveOnly) conditions.push(eq(systemOptions.isActive, true));

    return this.db
      .select()
      .from(systemOptions)
      .where(and(...conditions))
      .orderBy(asc(systemOptions.sortOrder), asc(systemOptions.label));
  }

  // ── 取全部選項（SuperAdmin 管理用）──
  async findAll() {
    return this.db
      .select()
      .from(systemOptions)
      .orderBy(asc(systemOptions.group), asc(systemOptions.sortOrder));
  }

  // ── 新增選項 ──
  async create(group: string, value: string, label: string, sortOrder = 0) {
    const [opt] = await this.db.insert(systemOptions).values({
      group,
      value: value.trim(),
      label: label.trim(),
      sortOrder,
    } as any).returning();
    return opt;
  }

  // ── 更新選項 ──
  async update(id: string, dto: { value?: string; label?: string; sortOrder?: number; isActive?: boolean }) {
    const [existing] = await this.db.select().from(systemOptions).where(eq(systemOptions.id, id)).limit(1);
    if (!existing) throw new NotFoundException('選項不存在');

    const setData: any = {};
    if (dto.value     !== undefined) setData.value     = dto.value.trim();
    if (dto.label     !== undefined) setData.label     = dto.label.trim();
    if (dto.sortOrder !== undefined) setData.sortOrder  = dto.sortOrder;
    if (dto.isActive  !== undefined) setData.isActive   = dto.isActive;

    const [updated] = await this.db.update(systemOptions)
      .set(setData)
      .where(eq(systemOptions.id, id))
      .returning();
    return updated;
  }

  // ── 刪除選項 ──
  async remove(id: string) {
    const [existing] = await this.db.select().from(systemOptions).where(eq(systemOptions.id, id)).limit(1);
    if (!existing) throw new NotFoundException('選項不存在');
    await this.db.delete(systemOptions).where(eq(systemOptions.id, id));
    return { success: true };
  }
}
