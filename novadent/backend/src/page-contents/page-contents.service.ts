import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../database/database.module';
import { pageContents } from '../database/schema';

type Db = any;

@Injectable()
export class PageContentsService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  async findAll() {
    return this.db.select().from(pageContents).orderBy(pageContents.key);
  }

  async findByKey(key: string) {
    const [row] = await this.db.select().from(pageContents).where(eq(pageContents.key, key));
    if (!row) throw new NotFoundException(`頁面內容 ${key} 不存在`);
    return row;
  }

  async update(key: string, data: { value: string; contentType?: string }, userId: string) {
    const [existing] = await this.db.select().from(pageContents).where(eq(pageContents.key, key));
    if (existing) {
      const [updated] = await this.db.update(pageContents)
        .set({ value: data.value, contentType: data.contentType || existing.contentType, updatedAt: new Date(), updatedBy: userId })
        .where(eq(pageContents.key, key))
        .returning();
      return updated;
    }
    const [created] = await this.db.insert(pageContents)
      .values({ key, value: data.value, contentType: data.contentType || 'TEXT', updatedBy: userId })
      .returning();
    return created;
  }

  async ensureDefaults() {
    const existing = await this.db.select().from(pageContents);
    if (existing.length > 0) return;

    const defaults = [
      { key: 'CONTACT_PHONE', contentType: 'TEXT', value: '' },
      { key: 'CONTACT_EMAIL', contentType: 'TEXT', value: '' },
      { key: 'CONTACT_ADDRESS', contentType: 'TEXT', value: '' },
      { key: 'SOCIAL_FACEBOOK', contentType: 'TEXT', value: '' },
      { key: 'SOCIAL_LINE', contentType: 'TEXT', value: '' },
      { key: 'TERMS', contentType: 'RICHTEXT', value: '# 服務條款\n\n請在此輸入服務條款內容。' },
      { key: 'PRIVACY', contentType: 'RICHTEXT', value: '# 隱私權政策\n\n請在此輸入隱私權政策內容。' },
    ];

    await this.db.insert(pageContents).values(defaults);
  }
}
