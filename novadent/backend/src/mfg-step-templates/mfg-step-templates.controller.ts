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

  @Roles('CLINIC', 'LAB', 'ADMIN', 'SUPER_ADMIN')
  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateMfgStepTemplateDto) {
    return this.svc.create(dto);
  }

  @Roles('SUPER_ADMIN')
  @Put('reorder')
  reorder(@Body() dto: ReorderTemplatesDto) {
    return this.svc.reorder(dto.ids);
  }

  @Roles('SUPER_ADMIN')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMfgStepTemplateDto) {
    return this.svc.update(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deactivate(id);
  }
}
