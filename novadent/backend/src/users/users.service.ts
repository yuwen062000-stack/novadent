// Users Service — 用戶管理核心業務邏輯（Admin 操作為主）
import {
  Injectable, Inject, NotFoundException, BadRequestException, ConflictException
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq, ilike, and, or, sql } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { users, clinics, labs, auditLogs } from '../database/schema';
import { CreateUserDto, UpdateUserDto, CreateSubAccountDto } from './dto/user.dto';

const SALT_ROUNDS = 12;

// 產生臨時密碼：4位大寫字母 + 4位數字（e.g. ABCD1234）
function generateTempPassword(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 排除易混淆字元
  const digits  = '0123456789';
  let pass = '';
  for (let i = 0; i < 4; i++) pass += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++) pass += digits[Math.floor(Math.random() * digits.length)];
  return pass;
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB_TOKEN) private db: Db) {}

  // ── 寫入操作日誌 ──────────────────────────────────────────
  private async writeAuditLog(
    userId: string | null,
    action: string,
    targetType?: string,
    targetId?: string,
    detail?: any,
  ) {
    await this.db.insert(auditLogs).values({
      userId,
      action,
      targetType,
      targetId,
      detail: detail ?? null,
    } as any).catch(() => {}); // 失敗不阻斷主流程
  }

  // ── 分頁查詢所有用戶（Admin）─────────────────────────────
  async findAll(query: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page     = query.page     ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset   = (page - 1) * pageSize;

    // 組合動態 where 條件
    const conditions: any[] = [];
    if (query.role)   conditions.push(eq(users.role,   query.role   as any));
    if (query.status) conditions.push(eq(users.status, query.status as any));
    if (query.search) {
      conditions.push(
        or(
          ilike(users.name,  `%${query.search}%`),
          ilike(users.email, `%${query.search}%`),
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        id:        users.id,
        email:     users.email,
        name:      users.name,
        role:      users.role,
        phone:     users.phone,
        status:    users.status,
        parentId:  users.parentId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset);

    // 取總數
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    return { data: rows, total: count, page, pageSize };
  }

  // ── 取單一用戶（Admin）───────────────────────────────────
  async findById(id: string) {
    const [user] = await this.db
      .select({
        id:                  users.id,
        email:               users.email,
        name:                users.name,
        role:                users.role,
        phone:               users.phone,
        status:              users.status,
        forceChangePassword: users.forceChangePassword,
        parentId:            users.parentId,
        createdAt:           users.createdAt,
        updatedAt:           users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) throw new NotFoundException('用戶不存在');
    return user;
  }

  // ── Admin 建立帳號（CLINIC 或 LAB）───────────────────────
  async create(dto: CreateUserDto, adminUserId: string) {
    // 檢查 email 是否重複
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    if (existing) throw new ConflictException('此 Email 已被使用');

    // 自動產生臨時密碼
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    // 建立 user（force_change_password = true）
    const [newUser] = await this.db.insert(users).values({
      email:               dto.email.toLowerCase(),
      passwordHash,
      role:                dto.role as any,
      name:                dto.name,
      phone:               dto.phone,
      status:              'ACTIVE',
      forceChangePassword: true,
    } as any).returning();

    // 依角色建立對應的 clinics / labs 記錄
    // email 未填時自動繼承帳號 email
    if (dto.role === 'CLINIC' && dto.clinicData) {
      await this.db.insert(clinics).values({
        userId:         newUser.id,
        name:           dto.clinicData.name,
        leadDoctorName: dto.clinicData.leadDoctorName || '',
        city:           dto.clinicData.city || '',
        phone:          dto.clinicData.phone,
        email:          dto.clinicData.email || newUser.email,
        description:    dto.clinicData.description,
        status:         'ACTIVE',
      } as any);
    } else if (dto.role === 'LAB' && dto.labData) {
      await this.db.insert(labs).values({
        userId:             newUser.id,
        name:               dto.labData.name,
        leadTechnicianName: dto.labData.leadTechnicianName || '',
        city:               dto.labData.city || '',
        phone:              dto.labData.phone,
        email:              dto.labData.email || newUser.email,
        status:             'ACTIVE',
      } as any);
    }

    // 寫入操作日誌
    await this.writeAuditLog(adminUserId, 'ADMIN_CREATE_USER', 'user', newUser.id, {
      createdEmail: newUser.email,
      createdRole:  newUser.role,
    });

    // 回傳新帳號資訊與臨時密碼（僅此一次顯示）
    return {
      id:           newUser.id,
      email:        newUser.email,
      name:         newUser.name,
      role:         newUser.role,
      tempPassword, // 明文只回傳一次，請立即通知用戶
    };
  }

  // ── 更新用戶基本資料 ─────────────────────────────────────
  async update(id: string, dto: UpdateUserDto, adminUserId: string) {
    await this.findById(id); // 確認用戶存在

    await this.db.update(users)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(eq(users.id, id));

    await this.writeAuditLog(adminUserId, 'UPDATE_USER', 'user', id, { changes: dto });

    return this.findById(id);
  }

  // ── 啟用 / 停用用戶 ─────────────────────────────────────
  async toggleStatus(id: string, adminUserId: string) {
    const user = await this.findById(id);
    const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

    await this.db.update(users)
      .set({ status: newStatus as any, updatedAt: new Date() } as any)
      .where(eq(users.id, id));

    await this.writeAuditLog(adminUserId, 'TOGGLE_USER_STATUS', 'user', id, {
      oldStatus: user.status,
      newStatus,
    });

    return { id, status: newStatus };
  }

  // ── Admin 重設密碼（產生臨時密碼，只顯示一次）─────────────
  async adminResetPassword(id: string, adminUserId: string) {
    await this.findById(id); // 確認用戶存在

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await this.db.update(users)
      .set({
        passwordHash,
        forceChangePassword: true,
        updatedAt: new Date(),
      } as any)
      .where(eq(users.id, id));

    await this.writeAuditLog(adminUserId, 'ADMIN_RESET_PASSWORD', 'user', id);

    // 臨時密碼明文回傳一次，前端需立即顯示給管理員
    return { tempPassword };
  }

  // ── 取子帳號列表 ─────────────────────────────────────────
  async getSubAccounts(parentId: string) {
    return this.db
      .select({
        id:        users.id,
        email:     users.email,
        name:      users.name,
        role:      users.role,
        phone:     users.phone,
        status:    users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.parentId, parentId));
  }

  // ── 建立子帳號 ────────────────────────────────────────────
  async createSubAccount(parentId: string, dto: CreateSubAccountDto) {
    const parent = await this.findById(parentId);

    // 檢查 email 是否重複
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    if (existing) throw new ConflictException('此 Email 已被使用');

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const [subAccount] = await this.db.insert(users).values({
      email:               dto.email.toLowerCase(),
      passwordHash,
      role:                parent.role as any, // 繼承父帳號角色
      name:                dto.name,
      phone:               dto.phone,
      status:              'ACTIVE',
      forceChangePassword: true,
      parentId,
    } as any).returning();

    await this.writeAuditLog(parentId, 'CREATE_SUB_ACCOUNT', 'user', subAccount.id);

    return {
      id:           subAccount.id,
      email:        subAccount.email,
      name:         subAccount.name,
      role:         subAccount.role,
      status:       subAccount.status,
      createdAt:    subAccount.createdAt,
      tempPassword,
    };
  }

  // ── 編輯子帳號（僅限父帳號操作）─────────────────────────────
  async updateSubAccount(parentId: string, subId: string, dto: { name?: string; phone?: string }) {
    const [sub] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, subId), eq(users.parentId, parentId)))
      .limit(1);
    if (!sub) throw new NotFoundException('子帳號不存在或無權限');

    const [updated] = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(eq(users.id, subId))
      .returning({
        id: users.id, email: users.email, name: users.name,
        role: users.role, phone: users.phone, status: users.status,
      });
    return updated;
  }

  // ── 刪除子帳號（僅限父帳號操作）─────────────────────────────
  async deleteSubAccount(parentId: string, subId: string) {
    const [sub] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, subId), eq(users.parentId, parentId)))
      .limit(1);
    if (!sub) throw new NotFoundException('子帳號不存在或無權限');

    await this.db.delete(users).where(eq(users.id, subId));
    await this.writeAuditLog(parentId, 'DELETE_SUB_ACCOUNT', 'user', subId);
    return { success: true };
  }

  // ── 重設子帳號密碼（僅限父帳號操作）─────────────────────────
  async resetSubAccountPassword(parentId: string, subId: string) {
    const [sub] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, subId), eq(users.parentId, parentId)))
      .limit(1);
    if (!sub) throw new NotFoundException('子帳號不存在或無權限');

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    await this.db.update(users)
      .set({ passwordHash, forceChangePassword: true, updatedAt: new Date() } as any)
      .where(eq(users.id, subId));

    await this.writeAuditLog(parentId, 'RESET_SUB_ACCOUNT_PASSWORD', 'user', subId);
    return { tempPassword };
  }

  // ── 更新自己的基本資料（Admin/SuperAdmin/任何角色）──────────
  async updateSelf(userId: string, dto: { name?: string; phone?: string }) {
    const [updated] = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(eq(users.id, userId))
      .returning({
        id: users.id, email: users.email, name: users.name,
        phone: users.phone, role: users.role,
      });
    if (!updated) throw new NotFoundException('使用者不存在');
    return updated;
  }
}
