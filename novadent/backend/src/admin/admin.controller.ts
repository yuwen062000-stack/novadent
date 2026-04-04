// M-08 Admin Controller
import {
  Controller, Get, Post, Delete, Put,
  Param, Query, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsArray, IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// DTO
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
}

class UpdateMenuConfigDto {
  @IsArray() items: MenuItemDto[];
}

// ── Admin & SuperAdmin Controller ─────────────────────────────
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // 儀表板統計
  @Get('stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // 選單設定
  @Get('menu-config')
  getMenuConfig() {
    return this.adminService.getMenuConfig();
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
}

// ── SuperAdmin Only: Audit Logs ───────────────────────────────
@Controller('admin/audit-logs')
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
