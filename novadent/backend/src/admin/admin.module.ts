import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController, AuditLogsController } from './admin.controller';

@Module({
  controllers: [AdminController, AuditLogsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
