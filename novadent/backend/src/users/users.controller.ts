// Users Controller — 用戶管理 API 路由（Admin 操作 + 子帳號管理）
import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard }   from '../common/guards/roles.guard';
import { Roles }        from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, CreateSubAccountDto } from './dto/user.dto';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── GET /api/users — Admin 取全部用戶列表（分頁）─────────
  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  findAll(
    @Query('role')     role?: string,
    @Query('status')   status?: string,
    @Query('search')   search?: string,
    @Query('page')     page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.usersService.findAll({
      role,
      status,
      search,
      page:     page     ? Number(page)     : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  // ── GET /api/users/me/sub-accounts — CLINIC/LAB 取自己的子帳號
  @Get('me/sub-accounts')
  @Roles('CLINIC', 'LAB')
  getMySubAccounts(@CurrentUser() user: any) {
    return this.usersService.getSubAccounts(user.id);
  }

  // ── POST /api/users/me/sub-accounts — CLINIC/LAB 建立子帳號
  @Post('me/sub-accounts')
  @Roles('CLINIC', 'LAB')
  createMySubAccount(@CurrentUser() user: any, @Body() dto: CreateSubAccountDto) {
    return this.usersService.createSubAccount(user.id, dto);
  }

  // ── GET /api/users/:id — Admin 取單一用戶 ───────────────
  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  // ── POST /api/users — Admin 建立 CLINIC/LAB 帳號 ────────
  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    return this.usersService.create(dto, user.id);
  }

  // ── PATCH /api/users/:id — Admin 更新用戶基本資料 ────────
  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.update(id, dto, user.id);
  }

  // ── POST /api/users/:id/toggle-status — Admin 啟用/停用帳號
  @Post(':id/toggle-status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  toggleStatus(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.usersService.toggleStatus(id, user.id);
  }

  // ── POST /api/users/:id/reset-password — Admin 重設密碼
  @Post(':id/reset-password')
  @Roles('ADMIN', 'SUPER_ADMIN')
  resetPassword(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.usersService.adminResetPassword(id, user.id);
  }
}
