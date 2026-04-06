import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController, PartnerLinksPublicController, AuditLogsController } from './admin.controller';

@Module({
  controllers: [AdminController, PartnerLinksPublicController, AuditLogsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
