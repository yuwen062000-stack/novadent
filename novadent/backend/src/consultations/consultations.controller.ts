// Consultations Controller — QA 諮詢 API 路由（MEMBER 專用）
import {
  Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe
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
}
