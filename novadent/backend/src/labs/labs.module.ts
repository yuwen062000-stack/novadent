// Labs Module — 牙技所管理模組（DatabaseModule 已是 Global）
import { Module } from '@nestjs/common';
import { LabsPublicController, LabsUserController, LabsAdminController } from './labs.controller';
import { LabsService } from './labs.service';

@Module({
  // 注意：LabsUserController 必須在 LabsPublicController 前面
  // 原因：同掛 @Controller('api/labs')，若 Public 先註冊 @Get(':id')，
  // 則 GET /api/labs/me 會被 ParseUUIDPipe 攔截並拋 400
  controllers: [LabsUserController, LabsPublicController, LabsAdminController],
  providers:   [LabsService],
  exports:     [LabsService], // 供 Cases 模組使用
})
export class LabsModule {}
