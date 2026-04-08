// Clinics Controller — 診所資料 API 路由（公開 + 診所自身 + Admin）
import {
  Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard }   from '../common/guards/roles.guard';
import { Roles }        from '../common/decorators/roles.decorator';
import { Public }       from '../common/decorators/public.decorator';
import { CurrentUser }  from '../common/decorators/current-user.decorator';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto, UpdateClinicDto, UpdateClinicStatusDto } from './dto/clinic.dto';

// ── 公開路由（GET /api/clinics, GET /api/clinics/:id）──────────
@Controller('api/clinics')
export class ClinicsPublicController {
  constructor(private readonly clinicsService: ClinicsService) {}

  // GET /api/clinics — 公開列表（只回傳 ACTIVE，city 支援多選：?city=台北市&city=台中市）
  @Public()
  @Get()
  findAll(
    @Query('city')     city?: string | string[],
    @Query('type')     type?: string,
    @Query('search')   search?: string,
    @Query('page')     page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.clinicsService.findAll({
      city,
      type,
      search,
      page:     page     ? Number(page)     : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    }, false);
  }

  // GET /api/clinics/:id — 公開取單一診所
  @Public()
  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinicsService.findById(id, false);
  }
}

// ── 診所自身路由（GET /api/clinics/me、PATCH /api/clinics/me）──
@Controller('api/clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicsUserController {
  constructor(private readonly clinicsService: ClinicsService) {}

  // GET /api/clinics/me — CLINIC 取自己的資料
  @Get('me')
  @Roles('CLINIC')
  getMe(@CurrentUser() user: any) {
    return this.clinicsService.findByUserId(user.id);
  }

  // PATCH /api/clinics/me — CLINIC 更新自己的基本資料
  @Patch('me')
  @Roles('CLINIC')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.findByUserId(user.id).then((clinic: any) =>
      // internalNotes 不允許 CLINIC 角色修改，移除後再更新
      this.clinicsService.update(clinic.id, { ...dto, internalNotes: undefined }, user.id)
    );
  }
}

// ── Admin 路由（/api/admin/clinics）──────────────────────────
@Controller('api/admin/clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicsAdminController {
  constructor(private readonly clinicsService: ClinicsService) {}

  // GET /api/admin/clinics — Admin 取全部診所（含各種狀態）
  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  findAll(
    @Query('status')   status?: string,
    @Query('city')     city?: string,
    @Query('search')   search?: string,
    @Query('page')     page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.clinicsService.findAll({
      status,
      city,
      search,
      page:     page     ? Number(page)     : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    }, true);
  }

  // PATCH /api/admin/clinics/:id — Admin 更新診所資料（含 internalNotes）
  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicDto,
    @CurrentUser() user: any,
  ) {
    return this.clinicsService.adminUpdate(id, dto, user.id);
  }

  // POST /api/admin/clinics — Admin 新增診所
  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(
    @Body() dto: CreateClinicDto,
    @CurrentUser() user: any,
  ) {
    return this.clinicsService.adminCreate(dto, user.id);
  }

  // PATCH /api/admin/clinics/:id/status — Admin 審核診所狀態
  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.clinicsService.updateStatus(id, dto, user.id);
  }

  // DELETE /api/admin/clinics/:id — Admin 刪除診所
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPER_ADMIN')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicsService.adminDelete(id, user.id);
  }
}
