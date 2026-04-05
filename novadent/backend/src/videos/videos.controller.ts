import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { VideosService } from './videos.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/videos')
export class VideosPublicController {
  constructor(private videosService: VideosService) {}

  @Get()
  @Public()
  findPublished() {
    return this.videosService.findPublished();
  }

  @Get('featured')
  @Public()
  findFeatured() {
    return this.videosService.findFeatured();
  }
}

@Controller('api/admin/videos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class VideosAdminController {
  constructor(private videosService: VideosService) {}

  @Get()
  findAll() {
    return this.videosService.findAll();
  }

  @Post()
  create(
    @Body() body: { title: string; videoUrl: string; description?: string; thumbnailUrl?: string; featuredOnHome?: boolean },
    @CurrentUser('id') userId: string,
  ) {
    return this.videosService.create(body, userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { title?: string; videoUrl?: string; description?: string; thumbnailUrl?: string; sortOrder?: number }) {
    return this.videosService.update(id, body);
  }

  @Patch(':id/toggle-publish')
  togglePublish(@Param('id') id: string) {
    return this.videosService.togglePublish(id);
  }

  @Patch(':id/toggle-featured')
  toggleFeatured(@Param('id') id: string) {
    return this.videosService.toggleFeatured(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.videosService.remove(id);
  }
}
