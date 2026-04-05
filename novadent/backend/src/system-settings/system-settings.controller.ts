// ── V1.3 系統參數設定 Controller ──────────────────────────────
// 僅 SUPER_ADMIN 可存取，提供系統參數的讀取與批次更新
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
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

  /** 取得所有系統設定 */
  @Get()
  async getAll() {
    return this.service.getAll();
  }

  /** 批次新增/更新系統設定（key-value 形式） */
  @Put()
  async bulkUpsert(
    @Body() body: { settings: { key: string; value: string; description?: string }[] },
    @CurrentUser() user: any,
  ) {
    return this.service.bulkUpsert(body.settings, user.id);
  }
}
