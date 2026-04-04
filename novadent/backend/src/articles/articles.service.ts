// M-07 Articles Service — 衛教文章管理
import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { articles } from '../database/schema';
import { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';

@Injectable()
export class ArticlesService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  // 公開查詢（只回傳已發佈）
  async findPublished(query: { category?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    const where = query.category
      ? and(eq(articles.published, true), eq(articles.category, query.category))
      : eq(articles.published, true);

    const [rows, countResult] = await Promise.all([
      this.db.select({
        id: articles.id, slug: articles.slug, title: articles.title,
        category: articles.category, tags: articles.tags, summary: articles.summary,
        author: articles.author, coverUrl: articles.coverUrl, publishedAt: articles.updatedAt,
      }).from(articles).where(where).orderBy(desc(articles.updatedAt)).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(articles).where(where),
    ]);

    return { data: rows, total: countResult[0]?.count ?? 0, page, pageSize };
  }

  // 依 slug 查詢（公開，只回傳已發佈）
  async findBySlug(slug: string) {
    const [row] = await this.db.select().from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.published, true))).limit(1);
    if (!row) throw new NotFoundException('文章不存在');
    return row;
  }

  // Admin 查詢（含未發佈）
  async findAll(query: { category?: string; published?: boolean; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    let where: any = undefined;
    if (query.category && query.published !== undefined)
      where = and(eq(articles.category, query.category), eq(articles.published, query.published));
    else if (query.category)
      where = eq(articles.category, query.category);
    else if (query.published !== undefined)
      where = eq(articles.published, query.published);

    const [rows, countResult] = await Promise.all([
      this.db.select().from(articles)
        .where(where).orderBy(desc(articles.updatedAt)).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(articles).where(where),
    ]);

    return { data: rows, total: countResult[0]?.count ?? 0, page, pageSize };
  }

  // 建立
  async create(dto: CreateArticleDto, adminUserId: string) {
    const existing = await this.db.select().from(articles).where(eq(articles.slug, dto.slug)).limit(1);
    if (existing.length > 0) throw new ConflictException('此 slug 已存在');

    const [row] = await this.db.insert(articles).values({
      ...dto,
      published: false,
      createdBy: adminUserId,
    } as any).returning();
    return row;
  }

  // 更新
  async update(id: string, dto: UpdateArticleDto) {
    const [row] = await this.db.select().from(articles).where(eq(articles.id, id)).limit(1);
    if (!row) throw new NotFoundException('文章不存在');

    const [updated] = await this.db.update(articles)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(eq(articles.id, id)).returning();
    return updated;
  }

  // 發佈 / 取消發佈
  async publish(id: string) {
    await this.checkExists(id);
    await this.db.update(articles).set({ published: true, updatedAt: new Date() } as any).where(eq(articles.id, id));
    return { success: true };
  }

  async unpublish(id: string) {
    await this.checkExists(id);
    await this.db.update(articles).set({ published: false, updatedAt: new Date() } as any).where(eq(articles.id, id));
    return { success: true };
  }

  // 刪除
  async delete(id: string) {
    await this.checkExists(id);
    await this.db.delete(articles).where(eq(articles.id, id));
    return { success: true };
  }

  private async checkExists(id: string) {
    const [row] = await this.db.select().from(articles).where(eq(articles.id, id)).limit(1);
    if (!row) throw new NotFoundException('文章不存在');
  }
}
