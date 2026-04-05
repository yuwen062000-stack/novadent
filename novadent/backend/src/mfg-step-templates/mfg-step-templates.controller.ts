// ── 製程步驟模板管理 Controller ──────────────────────────────
// 提供製程模板的 CRUD 與排序功能
// 讀取：CLINIC/LAB/ADMIN/SUPER_ADMIN 可用
// 寫入：僅 SUPER_ADMIN 可新增、修改、排序、停用
import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MfgStepTemplatesService } from './mfg-step-templates.service';
import { CreateMfgStepTemplateDto, UpdateMfgStepTemplateDto, ReorderTemplatesDto } from './dto/mfg-step-template.dto';

@Controller('api/mfg-step-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MfgStepTemplatesController {
  constructor(private readonly svc: MfgStepTemplatesService) {}

  /** 取得所有製程模板 — CLINIC/LAB/ADMIN/SUPER_ADMIN 可用 */
  @Roles('CLINIC', 'LAB', 'ADMIN', 'SUPER_ADMIN')
  @Get()
  findAll() {
    return this.svc.findAll();
  }

  /** 新增製程模板 — 僅 SUPER_ADMIN */
  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateMfgStepTemplateDto) {
    return this.svc.create(dto);
  }

  /** 批次重新排序模板 — 僅 SUPER_ADMIN */
  @Roles('SUPER_ADMIN')
  @Put('reorder')
  reorder(@Body() dto: ReorderTemplatesDto) {
    return this.svc.reorder(dto.ids);
  }

  /** 更新指定模板 — 僅 SUPER_ADMIN */
  @Roles('SUPER_ADMIN')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMfgStepTemplateDto) {
    return this.svc.update(id, dto);
  }

  /** 停用指定模板（軟刪除）— 僅 SUPER_ADMIN */
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deactivate(id);
  }
}
