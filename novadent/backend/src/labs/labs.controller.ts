// Labs Controller — 牙技所 API 路由（公開 + 牙技所自身 + Admin）
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard }    from '../common/guards/jwt-auth.guard';
import { RolesGuard }      from '../common/guards/roles.guard';
import { Roles }           from '../common/decorators/roles.decorator';
import { Public }          from '../common/decorators/public.decorator';
import { CurrentUser }     from '../common/decorators/current-user.decorator';
import { LabsService }     from './labs.service';
import { CreateLabDto, UpdateLabDto, UpdateLabStatusDto } from './dto/lab.dto';

// ── 公開路由（GET /api/labs, GET /api/labs/:id）───────────────
@Controller('api/labs')
export class LabsPublicController {
  constructor(private readonly labsService: LabsService) {}

  // GET /api/labs — 公開列表（只回傳 ACTIVE，不需登入，city 支援多選）
  @Public()
  @Get()
  findAll(
    @Query('city')     city?: string | string[],
    @Query('search')   search?: string,
    @Query('page')     page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.labsService.findAllPublic({
      city,
      search,
      page:     page     ? Number(page)     : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  // GET /api/labs/:id — 公開取單一牙技所（只回傳 ACTIVE）
  @Public()
  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.labsService.findById(id, false);
  }
}

// ── 牙技所自身路由（GET/PATCH /api/labs/me）──────────────────
@Controller('api/labs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LabsUserController {
  constructor(private readonly labsService: LabsService) {}

  // GET /api/labs/me — LAB 取自己的資料
  @Get('me')
  @Roles('LAB')
  getMe(@CurrentUser() user: any) {
    return this.labsService.findByUserId(user.id);
  }

  // PATCH /api/labs/me — LAB 更新自己的資料（不含 internalNotes）
  @Patch('me')
  @Roles('LAB')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateLabDto) {
    return this.labsService.findByUserId(user.id).then((lab: any) =>
      this.labsService.update(lab.id, { ...dto, internalNotes: undefined }, user.id)
    );
  }
  // 注意：GET /api/labs 與 GET /api/labs/:id 由 LabsPublicController（@Public）及
  // LabsAdminController（/api/admin/labs）負責，避免路由衝突
}

// ── Admin 路由（/api/admin/labs）──────────────────────────────
@Controller('api/admin/labs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LabsAdminController {
  constructor(private readonly labsService: LabsService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  findAll(
    @Query('status')   status?: string,
    @Query('city')     city?: string,
    @Query('search')   search?: string,
    @Query('page')     page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.labsService.findAll({
      status,
      city,
      search,
      page:     page     ? Number(page)     : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.labsService.findById(id, true);
  }


  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLabDto,
    @CurrentUser() user: any,
  ) {
    return this.labsService.update(id, dto, user.id);
  }

  // POST /api/admin/labs — Admin 新增牙技所
  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(
    @Body() dto: CreateLabDto,
    @CurrentUser() user: any,
  ) {
    return this.labsService.adminCreate(dto, user.id);
  }

  // PATCH /api/admin/labs/:id/status — Admin 審核牙技所狀態
  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLabStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.labsService.updateStatus(id, dto, user.id);
  }

  // DELETE /api/admin/labs/:id — Admin 刪除牙技所
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPER_ADMIN')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.labsService.adminDelete(id, user.id);
  }
}
