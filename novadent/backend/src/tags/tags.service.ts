// Tags Service — 診所服務標籤管理（SuperAdmin 新增/編輯/刪除，診所自選）
import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { clinicTags } from '../database/schema';

@Injectable()
export class TagsService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  // ── 取全部 tag（isActiveOnly=true 只回傳啟用中的）──────────
  async findAll(isActiveOnly = false) {
    const rows = await this.db
      .select()
      .from(clinicTags)
      .where(isActiveOnly ? eq(clinicTags.isActive, true) : undefined)
      .orderBy(asc(clinicTags.sortOrder), asc(clinicTags.name));
    return rows;
  }

  // ── 新增 tag ───────────────────────────────────────────────
  async create(name: string, sortOrder = 0) {
    const existing = await this.db
      .select({ id: clinicTags.id })
      .from(clinicTags)
      .where(eq(clinicTags.name, name.trim()))
      .limit(1);
    if (existing.length > 0) throw new ConflictException('此 Tag 名稱已存在');

    const [tag] = await this.db.insert(clinicTags).values({
      name: name.trim(),
      sortOrder,
    }).returning();
    return tag;
  }

  // ── 更新 tag 名稱 / 排序 / 啟用狀態 ───────────────────────
  async update(id: string, dto: { name?: string; sortOrder?: number; isActive?: boolean }) {
    const [existing] = await this.db
      .select()
      .from(clinicTags)
      .where(eq(clinicTags.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Tag 不存在');

    const [updated] = await this.db.update(clinicTags)
      .set({
        ...(dto.name      !== undefined && { name: dto.name.trim() }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive  !== undefined && { isActive: dto.isActive }),
      })
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
