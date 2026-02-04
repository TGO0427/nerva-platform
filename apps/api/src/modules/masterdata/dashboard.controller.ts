import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDataService } from './masterdata.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: MasterDataService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats(@TenantId() tenantId: string) {
    return this.service.getDashboardStats(tenantId);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity' })
  async getActivity(
    @TenantId() tenantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getRecentActivity(tenantId, limit || 10);
  }
}
