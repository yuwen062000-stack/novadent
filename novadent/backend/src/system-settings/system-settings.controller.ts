// ── V1.3 系統參數設定 Controller ──────────────────────────────
// 僅 SUPER_ADMIN 可存取，提供系統參數的讀取與批次/單筆更新
import { Controller, Get, Put, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/admin/system-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SystemSettingsController {
  constructor(private service: SystemSettingsService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Put()
  async bulkUpsert(
    @Body() body: { settings: { key: string; value: string; description?: string }[] },
    @CurrentUser() user: any,
  ) {
    return this.service.bulkUpsert(body.settings, user.id);
  }

  @Put(':key')
  async upsertByKey(
    @Param('key') key: string,
    @Body() body: { value: string; description?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.upsert(key, body.value, body.description, user.id);
  }

  @Patch(':key')
  async patchByKey(
    @Param('key') key: string,
    @Body() body: { value: string; description?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.upsert(key, body.value, body.description, user.id);
  }
}
