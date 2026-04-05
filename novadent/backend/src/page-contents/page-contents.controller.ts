import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { PageContentsService } from './page-contents.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/page-contents')
export class PageContentsPublicController {
  constructor(private pageContentsService: PageContentsService) {}

  @Get()
  @Public()
  findAll() {
    return this.pageContentsService.findAll();
  }

  @Get(':key')
  @Public()
  findByKey(@Param('key') key: string) {
    return this.pageContentsService.findByKey(key);
  }
}

@Controller('api/admin/page-contents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class PageContentsAdminController {
  constructor(private pageContentsService: PageContentsService) {}

  @Put(':key')
  update(
    @Param('key') key: string,
    @Body() body: { value: string; contentType?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.pageContentsService.update(key, body, userId);
  }
}
