// ── V1.3 郵件服務 ───────────────────────────────────────────
// 透過 nodemailer 發送系統信件
// SMTP 設定優先從 system_settings 資料表讀取，若無則使用環境變數
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Db } from '../database/db';
import { DB_TOKEN } from '../database/database.module';
import { systemSettings } from '../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private config: ConfigService,
    @Inject(DB_TOKEN) private db: Db,
  ) {}

  /** 從 system_settings 資料表讀取 SMTP 設定，回退至環境變數 */
  private async getSmtpConfig() {
    const rows = await this.db.select().from(systemSettings);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (row.key && row.value) settings[row.key] = row.value;
    }
    return {
      host: settings['smtp_host'] || this.config.get('SMTP_HOST') || '',
      port: parseInt(settings['smtp_port'] || this.config.get('SMTP_PORT') || '587'),
      secure: (settings['smtp_secure'] || this.config.get('SMTP_SECURE') || 'false') === 'true',
      user: settings['smtp_user'] || this.config.get('SMTP_USER') || '',
      pass: settings['smtp_pass'] || this.config.get('SMTP_PASS') || '',
      from: settings['smtp_from'] || this.config.get('SMTP_FROM') || 'noreply@novadent.com',
    };
  }

  /** 建立 nodemailer transporter（SMTP 未設定時回傳 null，跳過寄信） */
  private async getTransporter(): Promise<nodemailer.Transporter | null> {
    const smtp = await this.getSmtpConfig();
    if (!smtp.host || !smtp.user) {
      console.log('[MailService] SMTP not configured, skipping email');
      return null;
    }
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
  }

  /** 寄送自訂 HTML 信件 */
  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      if (!transporter) return false;

      const smtp = await this.getSmtpConfig();
      await transporter.sendMail({
        from: smtp.from,
        to,
        subject,
        html,
      });
      console.log(`[MailService] Email sent to ${to}: ${subject}`);
      return true;
    } catch (err) {
      console.error('[MailService] Failed to send email:', err);
      return false;
    }
  }

  /** 寄送密碼重設信（含重設連結，10 分鐘後失效） */
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Novadent 密碼重設</h2>
        <p>您好，</p>
        <p>您收到此信是因為有人對您的 Novadent 帳號提出了密碼重設請求。</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">重設密碼</a></p>
        <p>此連結將於 10 分鐘後失效。如果您沒有提出此請求，請忽略此信。</p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">Novadent 諾星牙科整合平台</p>
      </div>
    `;
    return this.sendMail(to, 'Novadent 密碼重設', html);
  }

  /** 寄送歡迎信（新帳號建立時，可包含臨時密碼） */
  async sendWelcomeEmail(to: string, name: string, tempPassword?: string): Promise<boolean> {
    const passwordInfo = tempPassword
      ? `<p>您的臨時密碼為：<strong>${tempPassword}</strong></p><p>請登入後立即修改密碼。</p>`
      : '';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">歡迎加入 Novadent！</h2>
        <p>${name} 您好，</p>
        <p>您的 Novadent 帳號已成功建立。</p>
        ${passwordInfo}
        <p><a href="${this.config.get('FRONTEND_URL') || 'https://novadent.com'}/login" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">前往登入</a></p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">Novadent 諾星牙科整合平台</p>
      </div>
    `;
    return this.sendMail(to, '歡迎加入 Novadent', html);
  }
}
