// ── M-08 後台管理 Controller ────────────────────────────────
// ADMIN/SUPER_ADMIN：儀表板統計、選單設定、合作連結、廣播通知
// SUPER_ADMIN 專屬：稽核日誌
import {
  Controller, Get, Post, Patch, Delete, Put,
  Param, Query, Body, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsArray, IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// ── DTO 定義 ────────────────────────────────────────────────
class CreatePartnerLinkDto {
  @IsString() clinicId: string;
  @IsString() labId: string;
}

class MenuItemDto {
  @IsOptional() @IsString() id?: string;
  @IsString() label: string;
  @IsString() path: string;
  @IsArray() roles: string[];
  @IsNumber() @Type(() => Number) order: number;
  @IsBoolean() visible: boolean;
  @IsOptional() @IsString() menuType?: string;       // 'PUBLIC' | 'ADMIN'
  @IsOptional() parentId?: string | null;            // 父群組 id
  @IsOptional() @IsBoolean() showInFooter?: boolean; // 是否顯示於 Footer 快速連結
}

class UpdateMenuConfigDto {
  @IsArray() items: MenuItemDto[];
}

class BroadcastNotificationDto {
  @IsString() title: string;
  @IsString() content: string;
  @IsOptional() @IsArray() targetRoles?: string[];
}

// ── Admin & SuperAdmin Controller ─────────────────────────────
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // 儀表板統計
  @Get('stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // 選單設定（管理後台，需登入）
  @Get('menu-config')
  getMenuConfig() {
    return this.adminService.getMenuConfig();
  }

  // 公開前台選單（訪客導覽列 + Footer 快速連結，不需登入）
  // 注意：固定路由 'menu-public' 必須在動態路由 'menu-config' 之前宣告
  @Get('menu-public')
  @Public()
  getPublicMenuItems() {
    return this.adminService.getPublicMenuItems();
  }

  @Put('menu-config')
  updateMenuConfig(
    @Body() dto: UpdateMenuConfigDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.updateMenuConfig(dto.items, userId);
  }

  // 合作連結
  @Get('partner-links')
  getPartnerLinks(
    @Query('clinicId') clinicId?: string,
    @Query('labId') labId?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.getPartnerLinks({
      clinicId, labId,
      page: page ? parseInt(page) : 1,
    });
  }

  @Post('partner-links')
  createPartnerLink(
    @Body() dto: CreatePartnerLinkDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.createPartnerLink(dto.clinicId, dto.labId, userId);
  }

  @Delete('partner-links/:id')
  @HttpCode(HttpStatus.OK)
  deletePartnerLink(@Param('id') id: string) {
    return this.adminService.deletePartnerLink(id);
  }

  // GET /api/admin/dashboard — alias for /api/admin/stats
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Post('notifications/broadcast')
  broadcastNotification(
    @Body() dto: BroadcastNotificationDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.broadcastNotification(dto.title, dto.content, dto.targetRoles, user.id);
  }

  // POST /api/admin/notifications — alias (without /broadcast)
  @Post('notifications')
  broadcastNotificationAlias(
    @Body() dto: BroadcastNotificationDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.broadcastNotification(dto.title, dto.content, dto.targetRoles, user.id);
  }

  // PATCH /api/admin/users/:id/toggle-status — Admin 啟用/停用帳號
  @Patch('users/:id/toggle-status')
  toggleUserStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.toggleUserStatus(id, user.id);
  }
}

// ── 公開合作連結 API ──────────────────────────────────────────
@Controller('api/partner-links')
export class PartnerLinksPublicController {
  constructor(private adminService: AdminService) {}

  // GET /api/partner-links — 公開查詢（可篩選 clinicId / labId）
  @Public()
  @Get()
  getPartnerLinks(
    @Query('clinicId') clinicId?: string,
    @Query('labId') labId?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.getPartnerLinks({
      clinicId, labId,
      page: page ? parseInt(page) : 1,
    });
  }

  // GET /api/partner-links/my — CLINIC取合作牙技所清單，LAB取合作診所清單
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLINIC', 'LAB')
  getMyPartnerLinks(@CurrentUser() user: any) {
    return this.adminService.getMyPartnerLinks(user.id, user.role);
  }

  // POST /api/partner-links/my — CLINIC 自行建立合作連結
  @Post('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLINIC')
  createMyPartnerLink(
    @CurrentUser() user: any,
    @Body() dto: { labId: string },
  ) {
    return this.adminService.createMyPartnerLink(user.id, dto.labId);
  }

  // DELETE /api/partner-links/my/:id — CLINIC 刪除自己的合作連結
  @Delete('my/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLINIC')
  deleteMyPartnerLink(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminService.deleteMyPartnerLink(user.id, id);
  }
}

// ── SuperAdmin Only: Audit Logs ───────────────────────────────
@Controller('api/admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AuditLogsController {
  constructor(private adminService: AdminService) {}

  @Get()
  getAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.getAuditLogs({
      userId, action,
      page: page ? parseInt(page) : 1,
    });
  }
}
