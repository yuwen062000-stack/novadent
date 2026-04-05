// ── M-06 通知 Controller ────────────────────────────────────
// 提供使用者通知的讀取、標記已讀功能（需登入）
import { Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /** 取得當前使用者的通知列表（可依已讀狀態篩選） */
  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query('read') read?: string,
    @Query('page') page?: string,
  ) {
    return this.notificationsService.findByUser(userId, {
      read: read !== undefined ? read === 'true' : undefined,
      page: page ? parseInt(page) : 1,
    });
  }

  /** 取得未讀通知數量 */
  @Get('unread-count')
  async unreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  /** 標記單則通知為已讀 */
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markRead(id, userId);
  }

  /** 一鍵標記所有通知為已讀 */
  @Post('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
