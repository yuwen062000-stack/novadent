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
    ClinicsPublicController,
    ClinicsUserController,
    ClinicsAdminController,
  ],
  providers: [ClinicsService],
  exports:   [ClinicsService], // 供 Consultations、Cases 模組使用
})
export class ClinicsModule {}
