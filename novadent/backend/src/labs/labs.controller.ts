// Labs Controller — 牙技所 API 路由（Admin + 牙技所自身）
import {
  Controller, Get, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe
} from '@nestjs/common';
import { JwtAuthGuard }    from '../common/guards/jwt-auth.guard';
import { RolesGuard }      from '../common/guards/roles.guard';
import { Roles }           from '../common/decorators/roles.decorator';
import { CurrentUser }     from '../common/decorators/current-user.decorator';
import { LabsService }     from './labs.service';
import { UpdateLabDto, UpdateLabStatusDto } from './dto/lab.dto';

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

  // GET /api/labs — Admin 取全部牙技所列表
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

  // GET /api/labs/:id — Admin 取單一牙技所
  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.labsService.findById(id, true);
  }
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
}
