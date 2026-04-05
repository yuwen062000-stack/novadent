// ── 檔案上傳模組 ────────────────────────────────────────────
// 包含上傳 Controller（需角色驗證）與靜態檔案讀取 Controller（公開）
import { Module } from '@nestjs/common';
import { UploadController, UploadServeController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController, UploadServeController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
