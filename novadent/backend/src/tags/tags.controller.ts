// Tags Controller — 服務標籤 API
// GET /api/tags?target=CLINIC   → 公開，診所 profile 頁載入可選 tag
// GET /api/tags?target=LAB      → 公開，牙技所 profile 頁載入可選 tag
// GET /api/tags                 → 公開，回傳全部啟用中 tag
// GET /api/super/tags           → SuperAdmin，含停用的全部
// POST /api/super/tags          → SuperAdmin 新增（含 targetType）
// PATCH /api/super/tags/:id     → SuperAdmin 編輯
// DELETE /api/super/tags/:id    → SuperAdmin 刪除
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, ParseUUIDPipe, Query
} from '@nestjs/common';
import { JwtAuthGuard }  from '../common/guards/jwt-auth.guard';
import { RolesGuard }    from '../common/guards/roles.guard';
import { Roles }         from '../common/decorators/roles.decorator';
import { Public }        from '../common/decorators/public.decorator';
import { TagsService }   from './tags.service';

@Controller('api/tags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TagsPublicController {
  constructor(private readonly tagsService: TagsService) {}

  // 公開端點：回傳 isActive=true 的 tag，可用 ?target=CLINIC 或 ?target=LAB 過濾
  @Get()
  @Public()
  findActive(@Query('target') target?: string) {
    return this.tagsService.findAll(true, target?.toUpperCase());
  }
}

@Controller('api/super/tags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TagsAdminController {
  constructor(private readonly tagsService: TagsService) {}

  // SuperAdmin 取全部 tag（含停用）
  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  findAll() {
    return this.tagsService.findAll(false);
  }

  // 新增 tag（含 targetType）
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  create(@Body() dto: { name: string; sortOrder?: number; targetType?: string }) {
    return this.tagsService.create(dto.name, dto.sortOrder, dto.targetType);
  }

  // 編輯 tag（含 targetType）
  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { name?: string; sortOrder?: number; isActive?: boolean; targetType?: string },
  ) {
    return this.tagsService.update(id, dto);
  }

  // 刪除 tag
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tagsService.remove(id);
  }
}
