// Consultations Controller — QA 諮詢 API 路由（MEMBER + Admin 管理用）
import {
  Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe
} from '@nestjs/common';
import { JwtAuthGuard }            from '../common/guards/jwt-auth.guard';
import { RolesGuard }              from '../common/guards/roles.guard';
import { Roles }                   from '../common/decorators/roles.decorator';
import { CurrentUser }             from '../common/decorators/current-user.decorator';
import { ConsultationsService }    from './consultations.service';
import { CreateConsultationDto }   from './dto/consultation.dto';

@Controller('api/consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  // POST /api/consultations — MEMBER 建立 QA 諮詢
  @Post()
  @Roles('MEMBER')
  create(@CurrentUser() user: any, @Body() dto: CreateConsultationDto) {
    return this.consultationsService.create(user.id, dto);
  }

  // GET /api/consultations — MEMBER 取自己的諮詢記錄
  @Get()
  @Roles('MEMBER')
  findMine(@CurrentUser() user: any) {
    return this.consultationsService.findByMember(user.id);
  }

  // GET /api/consultations/:id/recommendations — MEMBER 取推薦診所
  @Get(':id/recommendations')
  @Roles('MEMBER')
  recommend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.consultationsService.recommend(id, user.id);
  }

  // ── Admin / SuperAdmin 專用路由（必須放在 :id 之前避免路由衝突）──

  // GET /api/consultations/admin/all — Admin 查看所有會員諮詢記錄
  @Get('admin/all')
  @Roles('ADMIN', 'SUPER_ADMIN')
  findAllForAdmin(
    @Query('page')  page  = '1',
    @Query('limit') limit = '20',
  ) {
    return this.consultationsService.findAllForAdmin(
      parseInt(page,  10),
      parseInt(limit, 10),
    );
  }

  // GET /api/consultations/admin/:id — Admin 查看單一諮詢記錄（含推薦診所）
  @Get('admin/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  findOneForAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultationsService.findByIdForAdmin(id);
  }
}
