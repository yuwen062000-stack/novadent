// ── QA 常見問題管理 Controller ───────────────────────────────
// 公開 API：取得啟用中的 QA 問題（前台顯示用）
// 管理 API：SUPER_ADMIN 可 CRUD 及排序所有 QA 問題
import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { QaQuestionsService } from './qa-questions.service';
import { CreateQaQuestionDto, UpdateQaQuestionDto, ReorderQaQuestionsDto } from './dto/qa-question.dto';

@Controller('api/qa-questions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QaQuestionsController {
  constructor(private readonly svc: QaQuestionsService) {}

  /** 取得所有啟用中的 QA 問題（公開，無需登入） */
  @Public()
  @Get()
  findActive() {
    return this.svc.findActive();
  }

  /** 取得全部 QA 問題（含停用）— 僅 SUPER_ADMIN */
  @Roles('SUPER_ADMIN')
  @Get('all')
  findAll() {
    return this.svc.findAll();
  }

  /** 新增 QA 問題 — 僅 SUPER_ADMIN */
  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateQaQuestionDto) {
    return this.svc.create(dto);
  }

  /** 批次重新排序 QA 問題 — 僅 SUPER_ADMIN */
  @Roles('SUPER_ADMIN')
  @Put('reorder')
  reorder(@Body() dto: ReorderQaQuestionsDto) {
    return this.svc.reorder(dto.ids);
  }

  /** 更新指定 QA 問題 — 僅 SUPER_ADMIN */
  @Roles('SUPER_ADMIN')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQaQuestionDto) {
    return this.svc.update(id, dto);
  }

  /** 停用指定 QA 問題（軟刪除）— 僅 SUPER_ADMIN */
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deactivate(id);
  }
}
