// ── M-07 文章管理 Controller ────────────────────────────────
// 公開 API：前台文章列表與詳情（無需登入）
// 管理 API：ADMIN/SUPER_ADMIN 可 CRUD、發布/下架文章
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ── 公開 API（前台文章列表/詳情）────────────────────────────
@Controller('api/articles')
export class ArticlesPublicController {
  constructor(private articlesService: ArticlesService) {}

  @Public()
  @Get()
  findAll(@Query('category') category?: string, @Query('page') page?: string) {
    return this.articlesService.findPublished({ category, page: page ? parseInt(page) : 1 });
  }

  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.articlesService.findBySlug(slug);
  }
}

// ── 管理 API（ADMIN/SUPER_ADMIN 可 CRUD、發布/下架）─────────
@Controller('api/admin/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class ArticlesAdminController {
  constructor(private articlesService: ArticlesService) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('published') published?: string,
    @Query('page') page?: string,
  ) {
    return this.articlesService.findAll({
      category,
      published: published !== undefined ? published === 'true' : undefined,
      page: page ? parseInt(page) : 1,
    });
  }

  @Post()
  create(@Body() dto: CreateArticleDto, @CurrentUser('id') userId: string) {
    return this.articlesService.create(dto, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(@Param('id') id: string) {
    return this.articlesService.publish(id);
  }

  // PATCH /api/admin/articles/:id/publish — alias for frontend compatibility
  @Patch(':id/publish')
  publishViaPatch(@Param('id') id: string) {
    return this.articlesService.publish(id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublish(@Param('id') id: string) {
    return this.articlesService.unpublish(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string) {
    return this.articlesService.delete(id);
  }
}
