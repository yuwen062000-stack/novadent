import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DB_TOKEN } from '../database/database.module';
import { videos } from '../database/schema';

type Db = any;

@Injectable()
export class VideosService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  async findPublished() {
    return this.db.select().from(videos)
      .where(eq(videos.isPublished, true))
      .orderBy(videos.sortOrder);
  }

  async findFeatured() {
    return this.db.select().from(videos)
      .where(and(eq(videos.isPublished, true), eq(videos.featuredOnHome, true)))
      .orderBy(videos.sortOrder);
  }

  async findAll() {
    return this.db.select().from(videos).orderBy(videos.sortOrder);
  }

  async create(data: { title: string; videoUrl: string; description?: string; thumbnailUrl?: string; featuredOnHome?: boolean }, userId: string) {
    const maxOrder = await this.db.select().from(videos).orderBy(desc(videos.sortOrder)).limit(1);
    const sortOrder = (maxOrder[0]?.sortOrder ?? 0) + 1;
    const [created] = await this.db.insert(videos).values({ ...data, sortOrder, createdBy: userId }).returning();
    return created;
  }

  async update(id: string, data: { title?: string; videoUrl?: string; description?: string; thumbnailUrl?: string; sortOrder?: number }) {
    const [updated] = await this.db.update(videos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    if (!updated) throw new NotFoundException('影片不存在');
    return updated;
  }

  async togglePublish(id: string) {
    const [existing] = await this.db.select().from(videos).where(eq(videos.id, id));
    if (!existing) throw new NotFoundException('影片不存在');
    const [updated] = await this.db.update(videos)
      .set({ isPublished: !existing.isPublished, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return updated;
  }

  async toggleFeatured(id: string) {
    const [existing] = await this.db.select().from(videos).where(eq(videos.id, id));
    if (!existing) throw new NotFoundException('影片不存在');
    const [updated] = await this.db.update(videos)
      .set({ featuredOnHome: !existing.featuredOnHome, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db.delete(videos).where(eq(videos.id, id)).returning();
    if (!deleted) throw new NotFoundException('影片不存在');
    return { message: '影片已刪除' };
  }
}
