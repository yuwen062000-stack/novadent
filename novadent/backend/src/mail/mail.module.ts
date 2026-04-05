// ── V1.3 郵件服務模組（全域） ────────────────────────────────
// 使用 nodemailer 發送系統信件（密碼重設、歡迎信等）
// SMTP 設定從 system_settings 資料表讀取，支援動態更新
import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
