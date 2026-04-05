// M-06 Notifications Service — 站內通知管理
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { notifications } from '../database/schema';
import { CreateNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  // 取用戶通知列表（支援已讀篩選）
  async findByUser(userId: string, query: { read?: boolean; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const where = query.read !== undefined
      ? and(eq(notifications.userId, userId), eq(notifications.read, query.read))
      : eq(notifications.userId, userId);

    const [rows, countResult] = await Promise.all([
      this.db.select().from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` })
        .from(notifications).where(where),
    ]);

    return {
      data: rows,
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
    };
  }

  // 未讀數
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return result[0]?.count ?? 0;
  }

  // 標為已讀
  async markRead(notificationId: string, userId: string) {
    const [row] = await this.db.select().from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('通知不存在');

    await this.db.update(notifications)
      .set({ [notifications.read.name]: true } as any)
      .where(eq(notifications.id, notificationId));
    return { success: true };
  }

  // 全部已讀
  async markAllRead(userId: string) {
    await this.db.update(notifications)
      .set({ [notifications.read.name]: true } as any)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return { success: true };
  }

  // 建立通知（供其他 service 呼叫）
  async create(dto: CreateNotificationDto) {
    const [row] = await this.db.insert(notifications).values({
      userId: dto.userId,
      type: dto.type as any,
      title: dto.title,
      content: dto.content,
      relatedId: dto.relatedId,
    } as any).returning();
    return row;
  }

  // 批次建立通知（如案件狀態更新，同時通知診所+牙技所）
  async createBatch(items: CreateNotificationDto[]) {
    if (items.length === 0) return [];
    const rows = await this.db.insert(notifications).values(
      items.map(dto => ({
        userId: dto.userId,
        type: dto.type as any,
        title: dto.title,
        content: dto.content,
        relatedId: dto.relatedId,
      })) as any
    ).returning();
    return rows;
  }
}
