// M-06 Notifications Controller
import { Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // GET /api/notifications
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

  // GET /api/notifications/unread-count
  @Get('unread-count')
  async unreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  // PATCH /api/notifications/:id/read
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markRead(id, userId);
  }

  // POST /api/notifications/read-all
  @Post('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
