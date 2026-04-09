// SystemOptions Module — 系統選項（文章分類、案件類型）
import { Module } from '@nestjs/common';
import { SystemOptionsService } from './system-options.service';
import { SystemOptionsPublicController, SystemOptionsAdminController } from './system-options.controller';

@Module({
  controllers: [SystemOptionsPublicController, SystemOptionsAdminController],
  providers: [SystemOptionsService],
  exports: [SystemOptionsService],
})
export class SystemOptionsModule {}
