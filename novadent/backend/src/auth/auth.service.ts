// M-01 Auth Service
import {
  Injectable, UnauthorizedException, BadRequestException, NotFoundException, Inject
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, gt } from 'drizzle-orm';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import {
  users, passwordResetTokens, refreshTokens, auditLogs
} from '../database/schema';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto/auth.dto';
import { MailService } from '../mail/mail.service';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_TOKEN) private db: Db,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  // ── Login ────────────────────────────────────────────────
  async login(dto: LoginDto, ip?: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('帳號或密碼錯誤');
    }
    if (user.status === 'DISABLED') {
      throw new UnauthorizedException('此帳號已停用，請聯繫管理員');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    // 產生 Tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email, user.role, user.name);

    // 寫入 audit_log
    await this.writeAuditLog(user.id, 'LOGIN', 'user', user.id, { ip });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        forceChangePassword: user.forceChangePassword,
      },
    };
  }

  // ── Refresh Token ────────────────────────────────────────
  async refreshAccessToken(token: string) {
    const [stored] = await this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.token, token), gt(refreshTokens.expiresAt, new Date())))
      .limit(1);

    if (!stored) throw new UnauthorizedException('Refresh token 無效或已過期');

    const [user] = await this.db.select().from(users).where(eq(users.id, stored.userId)).limit(1);
    if (!user || user.status === 'DISABLED') throw new UnauthorizedException('帳號已停用');

    const accessToken = this.generateAccessToken(user.id, user.email, user.role, user.name);
    return { accessToken };
  }

  // ── Forgot Password（A-01）──────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    // 無論 email 是否存在，回傳相同訊息（防探測攻擊）
    if (!user) return;

    // 產生 token（10 分鐘有效）
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    } as any);

    const resetUrl = `${this.config.get('FRONTEND_URL') || ''}/reset-password?token=${token}`;
    console.log(`[DEV] 密碼重設連結：${resetUrl}`);
    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);

    await this.writeAuditLog(user.id, 'FORGOT_PASSWORD', 'user', user.id);
  }

  // ── Reset Password（A-01）───────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const [record] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, dto.token),
          gt(passwordResetTokens.expiresAt, new Date()),
        )
      )
      .limit(1);

    if (!record || record.usedAt) {
      throw new BadRequestException('連結已失效或已使用，請重新申請');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    // 更新密碼 + 標記 token 已使用
    await Promise.all([
      this.db.update(users)
        .set({ passwordHash, updatedAt: new Date() } as any)
        .where(eq(users.id, record.userId)),
      this.db.update(passwordResetTokens)
        .set({ usedAt: new Date() } as any)
        .where(eq(passwordResetTokens.id, record.id)),
    ]);

    await this.writeAuditLog(record.userId, 'RESET_PASSWORD', 'user', record.userId);
  }

  // ── Force Change Password（A-02 後續）───────────────────
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.db.update(users)
      .set({ passwordHash, forceChangePassword: false, updatedAt: new Date() } as any)
      .where(eq(users.id, userId));

    await this.writeAuditLog(userId, 'CHANGE_PASSWORD', 'user', userId);
  }

  // ── Logout ───────────────────────────────────────────────
  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    }
  }

  // ── Me（取得目前用戶資訊）──────────────────────────────
  async getMe(userId: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        phone: users.phone,
        status: users.status,
        forceChangePassword: users.forceChangePassword,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('用戶不存在');
    return user;
  }

  // ── 私有方法 ──────────────────────────────────────────────
  private generateAccessToken(id: string, email: string, role: string, name: string): string {
    return this.jwt.sign(
      { sub: id, email, role, name },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') || '15m',
      }
    );
  }

  private async generateTokens(id: string, email: string, role: string, name: string) {
    const accessToken = this.generateAccessToken(id, email, role, name);

    // Refresh Token（7 天）
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.db.insert(refreshTokens).values({ userId: id, token: refreshToken, expiresAt } as any);

    return { accessToken, refreshToken };
  }

  private async writeAuditLog(
    userId: string, action: string, targetType?: string, targetId?: string, detail?: any
  ) {
    await this.db.insert(auditLogs).values({
      userId,
      action,
      targetType,
      targetId,
      detail: detail ?? null,
    } as any).catch(() => {}); // audit log 失敗不影響主流程
  }

  // ── 初始化 SuperAdmin（系統第一次啟動用）─────────────────
  async initSuperAdmin() {
    const existing = await this.db
      .select()
      .from(users)
      .where(eq(users.role, 'SUPER_ADMIN'))
      .limit(1);

    if (existing.length > 0) return { message: 'SuperAdmin 已存在' };

    const passwordHash = await bcrypt.hash('SuperAdmin123!', SALT_ROUNDS);
    await this.db.insert(users).values({
      email: 'superadmin@novadent.com',
      passwordHash,
      role: 'SUPER_ADMIN',
      name: 'Super Admin',
      status: 'ACTIVE',
    } as any);

    console.log('✅ SuperAdmin 建立完成：superadmin@novadent.com / SuperAdmin123!');
    return { message: 'SuperAdmin 建立成功，請立即修改密碼' };
  }
}
