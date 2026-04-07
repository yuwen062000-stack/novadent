// ── V1.3 系統參數設定模組 ────────────────────────────────────
// 提供 SMTP、站台資訊等 key-value 系統設定管理
import { Module } from '@nestjs/common';
import { SystemSettingsController, PublicSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';
import { SitemapController } from './sitemap.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    SystemSettingsController,
    PublicSettingsController, // 公開 SEO 設定讀取（GET /api/settings/public）
    SitemapController,        // 動態 sitemap.xml（GET /sitemap.xml）
  ],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
