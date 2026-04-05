import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SiteImagesService } from './site-images.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/site-images')
export class SiteImagesPublicController {
  constructor(private siteImagesService: SiteImagesService) {}

  @Get()
  @Public()
  findAll(@Query('page') page?: string) {
    return this.siteImagesService.findAll(page);
  }
}

@Controller('api/admin/site-images')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class SiteImagesAdminController {
  constructor(private siteImagesService: SiteImagesService) {}

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { imageUrl?: string; altText?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.siteImagesService.update(id, body, userId);
  }
}
