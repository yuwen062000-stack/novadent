import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
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

  async update(id: string, data: { imageUrl?: string; altText?: string }, userId: string) {
    const [updated] = await this.db.update(siteImages)
      .set({ ...data, updatedAt: new Date(), updatedBy: userId })
      .where(eq(siteImages.id, id))
      .returning();
    return updated;
  }

  async ensureDefaults() {
    const existing = await this.db.select().from(siteImages);
    if (existing.length > 0) return;

    const defaults = [
      { page: 'HOME', position: 'HERO', altText: '首頁主視覺', sortOrder: 1 },
      { page: 'HOME', position: 'CHALLENGE', altText: '挑戰區塊圖片', sortOrder: 2 },
      { page: 'ABOUT', position: 'ABOUT_1', altText: '關於我們圖片1', sortOrder: 1 },
      { page: 'ABOUT', position: 'ABOUT_2', altText: '關於我們圖片2', sortOrder: 2 },
      { page: 'ABOUT', position: 'ABOUT_3', altText: '關於我們圖片3', sortOrder: 3 },
      { page: 'ABOUT', position: 'ABOUT_4', altText: '關於我們圖片4', sortOrder: 4 },
      { page: 'ABOUT', position: 'ABOUT_5', altText: '關於我們圖片5', sortOrder: 5 },
      { page: 'ABOUT', position: 'ABOUT_6', altText: '關於我們圖片6', sortOrder: 6 },
      { page: 'ABOUT', position: 'ABOUT_7', altText: '關於我們圖片7', sortOrder: 7 },
      { page: 'ABOUT', position: 'ABOUT_8', altText: '關於我們圖片8', sortOrder: 8 },
    ];

    await this.db.insert(siteImages).values(defaults);
  }
}
