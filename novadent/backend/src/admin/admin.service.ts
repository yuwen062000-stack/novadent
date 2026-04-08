// M-08 Admin Service — 後台管理
import { Injectable, Inject, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import {
  users, clinics, labs, cases, articles,
  partnerLinks, auditLogs, menuConfig, notifications,
} from '../database/schema';

@Injectable()
export class AdminService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  // ── 儀表板統計 ───────────────────────────────────────────────
  async getDashboardStats() {
    const [
      userCount, clinicCount, labCount, caseCount, articleCount,
    ] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` }).from(users),
      this.db.select({ count: sql<number>`count(*)::int` }).from(clinics),
      this.db.select({ count: sql<number>`count(*)::int` }).from(labs),
      this.db.select({ count: sql<number>`count(*)::int` }).from(cases),
      this.db.select({ count: sql<number>`count(*)::int` }).from(articles),
    ]);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const thisMonthStr = thisMonth.toISOString();

    const [monthlyCases] = await this.db.select({ count: sql<number>`count(*)::int` })
      .from(cases)
      .where(sql`${cases.createdAt} >= ${thisMonthStr}::timestamp`);

    return {
      users:        userCount[0]?.count ?? 0,
      clinics:      clinicCount[0]?.count ?? 0,
      labs:         labCount[0]?.count ?? 0,
      cases:        caseCount[0]?.count ?? 0,
      articles:     articleCount[0]?.count ?? 0,
      casesThisMonth: monthlyCases?.count ?? 0,
    };
  }

  // ── 操作日誌（僅 SUPER_ADMIN 可見）──────────────────────────
  async getAuditLogs(query: {
    userId?: string;
    action?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // 依條件篩選
    let where: any = undefined;
    if (query.userId && query.action) {
      where = and(eq(auditLogs.userId, query.userId), eq(auditLogs.action, query.action));
    } else if (query.userId) {
      where = eq(auditLogs.userId, query.userId);
    } else if (query.action) {
      where = eq(auditLogs.action, query.action);
    }

    const [rows, countResult] = await Promise.all([
      this.db.select({
        id:         auditLogs.id,
        userId:     auditLogs.userId,
        action:     auditLogs.action,
        targetType: auditLogs.targetType,
        targetId:   auditLogs.targetId,
        detail:     auditLogs.detail,
        ipAddress:  auditLogs.ipAddress,
        createdAt:  auditLogs.createdAt,
      }).from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(where),
    ]);

    return { data: rows, total: countResult[0]?.count ?? 0, page, pageSize };
  }

  // ── 合作連結 CRUD ────────────────────────────────────────────
  async getPartnerLinks(query: { clinicId?: string; labId?: string; page?: number }) {
    const page = query.page ?? 1;
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    let where: any = undefined;
    if (query.clinicId && query.labId) {
      where = and(eq(partnerLinks.clinicId, query.clinicId), eq(partnerLinks.labId, query.labId));
    } else if (query.clinicId) {
      where = eq(partnerLinks.clinicId, query.clinicId);
    } else if (query.labId) {
      where = eq(partnerLinks.labId, query.labId);
    }

    // JOIN clinics / labs 以直接回傳名稱，避免前端找不到 PENDING 診所而顯示 UUID
    const c = clinics;
    const l = labs;
    const [rows, countResult] = await Promise.all([
      this.db
        .select({
          id:        partnerLinks.id,
          clinicId:  partnerLinks.clinicId,
          labId:     partnerLinks.labId,
          status:    partnerLinks.status,
          createdAt: partnerLinks.createdAt,
          clinicName: c.name,
          labName:    l.name,
        })
        .from(partnerLinks)
        .leftJoin(c, eq(c.id, partnerLinks.clinicId))
        .leftJoin(l, eq(l.id, partnerLinks.labId))
        .where(where)
        .orderBy(desc(partnerLinks.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` })
        .from(partnerLinks)
        .where(where),
    ]);

    return { data: rows, total: countResult[0]?.count ?? 0, page, pageSize };
  }

  async createPartnerLink(clinicId: string, labId: string, adminUserId: string) {
    // 確認診所、牙技所存在
    const [clinic] = await this.db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
    if (!clinic) throw new NotFoundException('診所不存在');

    const [lab] = await this.db.select().from(labs).where(eq(labs.id, labId)).limit(1);
    if (!lab) throw new NotFoundException('牙技所不存在');

    // 確認尚未建立相同連結
    const existing = await this.db.select().from(partnerLinks)
      .where(and(eq(partnerLinks.clinicId, clinicId), eq(partnerLinks.labId, labId)))
      .limit(1);
    if (existing.length > 0) throw new ConflictException('此合作連結已存在');

    const [row] = await this.db.insert(partnerLinks).values({
      clinicId, labId,
      status: 'ACTIVE',
      createdBy: adminUserId,
    } as any).returning();
    return row;
  }

  async deletePartnerLink(id: string) {
    const [row] = await this.db.select().from(partnerLinks)
      .where(eq(partnerLinks.id, id)).limit(1);
    if (!row) throw new NotFoundException('連結不存在');

    await this.db.delete(partnerLinks).where(eq(partnerLinks.id, id));
    return { success: true };
  }

  // ── 子帳號解析：若 userId 無直接對應的診所/牙技所，查 parentId ──
  private async resolveEffectiveUserId(userId: string): Promise<string> {
    const [user] = await this.db
      .select({ parentId: users.parentId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user?.parentId ?? userId;
  }

  // ── 診所/牙技所查詢自己的合作清單 ───────────────────────────
  // CLINIC → 回傳合作牙技所清單；LAB → 回傳合作診所清單
  // 支援子帳號：若子帳號登入，自動映射到父帳號的診所/牙技所
  async getMyPartnerLinks(userId: string, role: string) {
    const effectiveId = await this.resolveEffectiveUserId(userId);
    if (role === 'CLINIC') {
      const [clinic] = await this.db.select({ id: clinics.id })
        .from(clinics).where(eq(clinics.userId, effectiveId)).limit(1);
      if (!clinic) return [];
      return this.db
        .select({
          id:             partnerLinks.id,
          labId:          partnerLinks.labId,
          labName:        labs.name,
          labCity:        labs.city,
          labPhone:       labs.phone,
          labPhotoUrl:    labs.coverPhotoUrl,
          createdAt:      partnerLinks.createdAt,
        })
        .from(partnerLinks)
        .leftJoin(labs, eq(labs.id, partnerLinks.labId))
        .where(eq(partnerLinks.clinicId, clinic.id))
        .orderBy(desc(partnerLinks.createdAt));
    } else if (role === 'LAB') {
      const [lab] = await this.db.select({ id: labs.id })
        .from(labs).where(eq(labs.userId, effectiveId)).limit(1);
      if (!lab) return [];
      return this.db
        .select({
          id:                partnerLinks.id,
          clinicId:          partnerLinks.clinicId,
          clinicName:        clinics.name,
          clinicCity:        clinics.city,
          clinicPhone:       clinics.phone,
          clinicPhotoUrl:    clinics.coverPhotoUrl,
          createdAt:         partnerLinks.createdAt,
        })
        .from(partnerLinks)
        .leftJoin(clinics, eq(clinics.id, partnerLinks.clinicId))
        .where(eq(partnerLinks.labId, lab.id))
        .orderBy(desc(partnerLinks.createdAt));
    }
    return [];
  }

  // ── 診所自行建立合作連結 ──────────────────────────────────
  async createMyPartnerLink(clinicUserId: string, labId: string) {
    const effectiveId = await this.resolveEffectiveUserId(clinicUserId);
    const [clinic] = await this.db.select({ id: clinics.id, name: clinics.name })
      .from(clinics).where(eq(clinics.userId, effectiveId)).limit(1);
    if (!clinic) throw new NotFoundException('診所不存在');
    return this.createPartnerLink(clinic.id, labId, clinicUserId);
  }

  // ── 診所刪除自己的合作連結（驗證歸屬）──────────────────────
  async deleteMyPartnerLink(clinicUserId: string, linkId: string) {
    const effectiveId = await this.resolveEffectiveUserId(clinicUserId);
    const [clinic] = await this.db.select({ id: clinics.id })
      .from(clinics).where(eq(clinics.userId, effectiveId)).limit(1);
    if (!clinic) throw new NotFoundException('診所不存在');

    const [link] = await this.db.select()
      .from(partnerLinks)
      .where(and(eq(partnerLinks.id, linkId), eq(partnerLinks.clinicId, clinic.id)))
      .limit(1);
    if (!link) throw new NotFoundException('連結不存在或無權限');

    await this.db.delete(partnerLinks).where(eq(partnerLinks.id, linkId));
    return { success: true };
  }

  // ── 廣播通知 ─────────────────────────────────────────────────
  async broadcastNotification(title: string, content: string, targetRoles?: string[], adminUserId?: string) {
    let where: any = undefined;
    if (targetRoles && targetRoles.length > 0) {
      where = inArray(users.role, targetRoles as any);
    }

    const targetUsers = await this.db.select({ id: users.id })
      .from(users)
      .where(where);

    if (targetUsers.length === 0) return { sent: 0 };

    const notificationValues = targetUsers.map(u => ({
      userId: u.id,
      type: 'SYSTEM' as const,
      title,
      content,
    }));

    await this.db.insert(notifications).values(notificationValues as any);

    if (adminUserId) {
      await this.db.insert(auditLogs).values({
        userId: adminUserId,
        action: 'BROADCAST_NOTIFICATION',
        targetType: 'notification',
        detail: { title, targetRoles, recipientCount: targetUsers.length },
      } as any).catch(() => {});
    }

    return { sent: targetUsers.length };
  }

  // ── 選單管理 ─────────────────────────────────────────────────

  // 取得所有選單（管理後台用，含新欄位）
  async getMenuConfig() {
    const rows = await this.db.select().from(menuConfig)
      .orderBy(menuConfig.order);
    return rows;
  }

  // 公開查詢：前台 PUBLIC 選單（訪客導覽列用，不需登入）
  async getPublicMenuItems() {
    const rows = await this.db.select().from(menuConfig)
      .where(eq(menuConfig.menuType as any, 'PUBLIC'))
      .orderBy(menuConfig.order);
    return rows;
  }

  // 整批更新選單設定（支援新欄位：menuType、parentId、showInFooter）
  async updateMenuConfig(
    items: {
      id?: string;
      label: string;
      path: string;
      roles: string[];
      order: number;
      visible: boolean;
      menuType?: string;
      parentId?: string | null;
      showInFooter?: boolean;
    }[],
    adminUserId: string,
  ) {
    // 清除舊有設定，重新寫入（整批替換）
    // 先按 path 去重：path 非空時同路徑只保留第一筆，避免前端傳入重複項目
    const seen = new Set<string>();
    const dedupedItems = items.filter(item => {
      if (!item.path || item.path.trim() === '') return true; // 父群組（空路徑）不去重
      if (seen.has(item.path)) return false;
      seen.add(item.path);
      return true;
    });

    await this.db.delete(menuConfig);

    if (dedupedItems.length === 0) return [];

    const rows = await this.db.insert(menuConfig).values(
      dedupedItems.map((item) => ({
        // ⚠️ 重要：保留現有 id，確保 parentId 外鍵在 DELETE→INSERT 後仍有效
        // 新增項目（id 為 undefined）由 DB 自動產生 UUID
        ...(item.id ? { id: item.id } : {}),
        label:        item.label,
        path:         item.path,
        roles:        item.roles,
        order:        item.order,
        visible:      item.visible,
        menuType:     item.menuType  ?? 'PUBLIC',
        parentId:     item.parentId  ?? null,
        showInFooter: item.showInFooter ?? false,
        updatedAt:    new Date(),
        updatedBy:    adminUserId,
      })) as any,
    ).returning();
    return rows;
  }

  // ── Toggle user status (active/inactive) ──────────────────
  async toggleUserStatus(userId: string, adminId: string) {
    const [existing] = await this.db
      .select({ id: users.id, status: users.status, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) throw new NotFoundException('使用者不存在');
    if (existing.role === 'SUPER_ADMIN') throw new ForbiddenException('無法變更超級管理員狀態');

    const newStatus = existing.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const [updated] = await this.db
      .update(users)
      .set({ status: newStatus, updatedAt: new Date() } as any)
      .where(eq(users.id, userId))
      .returning();

    await this.db.insert(auditLogs).values({
      userId: adminId,
      action: 'TOGGLE_USER_STATUS',
      targetId: userId,
      detail: { name: existing.name, from: existing.status, to: newStatus },
    } as any).catch(() => {});

    return updated;
  }
}
