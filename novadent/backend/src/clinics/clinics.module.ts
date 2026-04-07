// Clinics Module — 診所資料模組（DatabaseModule 已是 Global）
import { Module } from '@nestjs/common';
import {
  ClinicsPublicController,
  ClinicsUserController,
  ClinicsAdminController,
} from './clinics.controller';
import { ClinicsService } from './clinics.service';

@Module({
  controllers: [
    // 注意：ClinicsUserController 必須在 ClinicsPublicController 前面
    // 原因：兩者同掛 @Controller('api/clinics')，若 Public 先註冊 @Get(':id')，
    // 則 GET /api/clinics/me 會被 ParseUUIDPipe 攔截並拋 400（me 不是 UUID）
    ClinicsUserController,
    ClinicsPublicController,
    ClinicsAdminController,
  ],
  providers: [ClinicsService],
  exports:   [ClinicsService], // 供 Consultations、Cases 模組使用
})
export class ClinicsModule {}
