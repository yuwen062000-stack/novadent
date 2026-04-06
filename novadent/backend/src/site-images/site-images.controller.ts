import { Controller, Get, Put, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
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

  @Get()
  findAll(@Query('page') page?: string) {
    return this.siteImagesService.findAll(page);
  }

  @Post()
  create(
    @Body() body: { page: string; position: string; title?: string; blockType?: string; textContent?: string; imageUrl?: string; altText?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.siteImagesService.create(body, userId);
  }

  @Put('reorder/batch')
  reorder(
    @Body() body: { items: { id: string; sortOrder: number }[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.siteImagesService.reorder(body.items, userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { imageUrl?: string; altText?: string; title?: string; textContent?: string; blockType?: string; visible?: boolean; sortOrder?: number },
    @CurrentUser('id') userId: string,
  ) {
    return this.siteImagesService.update(id, body, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.siteImagesService.delete(id);
  }
}
