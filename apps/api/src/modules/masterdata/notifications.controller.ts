import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDataService } from './masterdata.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: MasterDataService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current user' })
  async list(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.service.listNotifications(tenantId, user.id, {
      page: page || 1,
      limit: limit || 20,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    const count = await this.service.getUnreadNotificationCount(tenantId, user.id);
    return { count };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id', UuidValidationPipe) id: string) {
    return this.service.markNotificationAsRead(id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.service.markAllNotificationsAsRead(tenantId, user.id);
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  async delete(@Param('id', UuidValidationPipe) id: string) {
    await this.service.deleteNotification(id);
    return { success: true };
  }
}
