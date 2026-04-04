// Labs Module — 牙技所管理模組（DatabaseModule 已是 Global）
import { Module } from '@nestjs/common';
import { LabsUserController, LabsAdminController } from './labs.controller';
import { LabsService } from './labs.service';

@Module({
  controllers: [LabsUserController, LabsAdminController],
  providers:   [LabsService],
  exports:     [LabsService], // 供 Cases 模組使用
})
export class LabsModule {}
