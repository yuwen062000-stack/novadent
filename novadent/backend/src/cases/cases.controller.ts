// Cases Controller — 案件 API 路由（含製程節點子路由）
import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe
} from '@nestjs/common';
import { JwtAuthGuard }    from '../common/guards/jwt-auth.guard';
import { RolesGuard }      from '../common/guards/roles.guard';
import { Roles }           from '../common/decorators/roles.decorator';
import { CurrentUser }     from '../common/decorators/current-user.decorator';
import { CasesService }    from './cases.service';
import { MfgStepsService } from './mfg-steps.service';
import { CreateCaseDto, AssignLabDto, UpdateMfgStepDto } from './dto/case.dto';

@Controller('api/cases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly mfgStepsService: MfgStepsService,
  ) {}

  // ── GET /api/cases — Admin 取全部案件 ────────────────────
  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  findAll(
    @Query('clinicId') clinicId?: string,
    @Query('labId')    labId?: string,
    @Query('status')   status?: string,
    @Query('type')     type?: string,
    @Query('page')     page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.casesService.findAll({
      clinicId,
      labId,
      status,
      type,
      page:     page     ? Number(page)     : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  // ── GET /api/cases/clinic — CLINIC 取自己診所的案件 ───────
  @Get('clinic')
  @Roles('CLINIC')
  findByClinic(
    @CurrentUser() user: any,
    @Query('status')   status?: string,
    @Query('type')     type?: string,
    @Query('page')     page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.casesService.findByClinic(user.id, {
      status,
      type,
      page:     page     ? Number(page)     : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  // ── GET /api/cases/lab — LAB 取配對診所的案件（已隔離）───
  @Get('lab')
  @Roles('LAB')
  findByLab(
    @CurrentUser() user: any,
    @Query('status')   status?: string,
    @Query('type')     type?: string,
    @Query('page')     page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.casesService.findByLab(user.id, {
      status,
      type,
      page:     page     ? Number(page)     : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  // ── GET /api/cases/member — MEMBER 取自己的案件 ───────────
  @Get('member')
  @Roles('MEMBER')
  findByMember(@CurrentUser() user: any) {
    return this.casesService.findByMember(user.id);
  }

  // ── GET /api/cases/my — 登入用戶取自己的案件（跨角色）────
  @Get('my')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CLINIC', 'LAB', 'MEMBER')
  findMyCases(@CurrentUser() user: any) {
    return this.casesService.findMyCases(user.id, user.role);
  }

  // ── GET /api/cases/:id — 登入用戶（依角色過濾）──────────
  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CLINIC', 'LAB', 'MEMBER')
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.casesService.findById(id, user.id, user.role);
  }

  // ── POST /api/cases — CLINIC 建案 ────────────────────────
  @Post()
  @Roles('CLINIC')
  create(@CurrentUser() user: any, @Body() dto: CreateCaseDto) {
    return this.casesService.create(user.id, dto);
  }

  // ── POST /api/cases/:id/assign — CLINIC 指派牙技所 ────────
  @Post(':id/assign')
  @Roles('CLINIC')
  assignLab(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignLabDto,
    @CurrentUser() user: any,
  ) {
    return this.casesService.assignLab(id, dto.labId, user.id);
  }

  // ── POST /api/cases/:id/accept — LAB 接單 ────────────────
  @Post(':id/accept')
  @Roles('LAB')
  acceptCase(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.casesService.acceptCase(id, user.id);
  }

  // ── POST /api/cases/:id/complete — CLINIC 確認結案 ────────
  @Post(':id/complete')
  @Roles('CLINIC')
  complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.casesService.complete(id, user.id);
  }

  // ── GET /api/cases/:id/steps — 取製程節點（登入用戶）────
  @Get(':id/steps')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CLINIC', 'LAB', 'MEMBER')
  getSteps(@Param('id', ParseUUIDPipe) id: string) {
    return this.mfgStepsService.getStepsByCase(id);
  }

  // ── PATCH /api/cases/:id/steps/:stepId — LAB 更新製程節點
  // 回傳完整案件（含製程節點），供前端 LabCaseDetail 直接更新畫面
  @Patch(':id/steps/:stepId')
  @Roles('LAB')
  async updateStep(
    @Param('id',     ParseUUIDPipe) caseId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: UpdateMfgStepDto,
    @CurrentUser() user: any,
  ) {
    await this.mfgStepsService.updateStep(stepId, user.id, dto);
    // updateStep 已重算 progress，此處再取完整案件回傳
    return this.casesService.findById(caseId, user.id, user.role);
  }

  // ── POST /api/cases/:id/mfg-steps — LAB 新增製程節點 ─────
  // Fix #3：前端 LabCaseDetail handleAddStep 呼叫此端點
  @Post(':id/mfg-steps')
  @Roles('LAB', 'CLINIC', 'ADMIN', 'SUPER_ADMIN')
  addMfgStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { name: string },
    @CurrentUser() user: any,
  ) {
    return this.casesService.addMfgStep(id, dto, user.id);
  }
}
