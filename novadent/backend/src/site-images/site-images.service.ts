import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../database/database.module';
import { siteImages } from '../database/schema';

type Db = any;

@Injectable()
export class SiteImagesService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  async findAll(page?: string) {
    if (page) {
      return this.db.select().from(siteImages).where(eq(siteImages.page, page)).orderBy(siteImages.sortOrder);
    }
    return this.db.select().from(siteImages).orderBy(siteImages.page, siteImages.sortOrder);
  }

  async create(data: { page: string; position: string; title?: string; blockType?: string; textContent?: string; imageUrl?: string; altText?: string }, userId: string) {
    const maxOrder = await this.db.select({ max: sql<number>`coalesce(max(sort_order), 0)` }).from(siteImages).where(eq(siteImages.page, data.page));
    const nextOrder = (maxOrder[0]?.max ?? 0) + 1;

    const [row] = await this.db.insert(siteImages).values({
      page: data.page,
      position: data.position,
      title: data.title || null,
      blockType: data.blockType || 'image',
      textContent: data.textContent || null,
      imageUrl: data.imageUrl || null,
      altText: data.altText || null,
      sortOrder: nextOrder,
      visible: true,
      updatedBy: userId,
    } as any).returning();
    return row;
  }

  async update(id: string, data: any, userId: string) {
    const [existing] = await this.db.select().from(siteImages).where(eq(siteImages.id, id)).limit(1);
    if (!existing) throw new NotFoundException('圖片不存在');

    const updateData: any = { updatedAt: new Date(), updatedBy: userId };
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.altText !== undefined) updateData.altText = data.altText;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.textContent !== undefined) updateData.textContent = data.textContent;
    if (data.blockType !== undefined) updateData.blockType = data.blockType;
    if (data.visible !== undefined) updateData.visible = data.visible;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const [updated] = await this.db.update(siteImages)
      .set(updateData)
      .where(eq(siteImages.id, id))
      .returning();
    return updated;
  }

  async reorder(items: { id: string; sortOrder: number }[], userId: string) {
    for (const item of items) {
      await this.db.update(siteImages)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date(), updatedBy: userId } as any)
        .where(eq(siteImages.id, item.id));
    }
    return { success: true };
  }

  async delete(id: string) {
    const [existing] = await this.db.select().from(siteImages).where(eq(siteImages.id, id)).limit(1);
    if (!existing) throw new NotFoundException('圖片不存在');
    await this.db.delete(siteImages).where(eq(siteImages.id, id));
    return { success: true };
  }

  async ensureDefaults() {
  }
}
