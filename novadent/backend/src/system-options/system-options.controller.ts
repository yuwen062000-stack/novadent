// SystemOptions Controller — 系統選項 API
// GET /api/options/:group          → 公開，前端取啟用中選項（文章分類、案件類型等）
// GET /api/super/options           → SuperAdmin，取全部
// GET /api/super/options/:group    → SuperAdmin，取指定 group 全部（含停用）
// POST /api/super/options          → SuperAdmin 新增
// PATCH /api/super/options/:id     → SuperAdmin 編輯
// DELETE /api/super/options/:id    → SuperAdmin 刪除
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard }  from '../common/guards/jwt-auth.guard';
import { RolesGuard }    from '../common/guards/roles.guard';
import { Roles }         from '../common/decorators/roles.decorator';
import { Public }        from '../common/decorators/public.decorator';
import { SystemOptionsService } from './system-options.service';

// 公開端點：前端取啟用中的選項
@Controller('api/options')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemOptionsPublicController {
  constructor(private readonly svc: SystemOptionsService) {}

  @Get(':group')
  @Public()
  findByGroup(@Param('group') group: string) {
    return this.svc.findByGroup(group.toUpperCase(), true);
  }
}

// SuperAdmin 管理端點
@Controller('api/super/options')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemOptionsAdminController {
  constructor(private readonly svc: SystemOptionsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  findAll() {
    return this.svc.findAll();
  }

  @Get(':group')
  @Roles('SUPER_ADMIN', 'ADMIN')
  findByGroup(@Param('group') group: string) {
    return this.svc.findByGroup(group.toUpperCase(), false);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  create(@Body() dto: { group: string; value: string; label: string; sortOrder?: number }) {
    return this.svc.create(dto.group.toUpperCase(), dto.value, dto.label, dto.sortOrder);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { value?: string; label?: string; sortOrder?: number; isActive?: boolean },
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(id);
  }
}
