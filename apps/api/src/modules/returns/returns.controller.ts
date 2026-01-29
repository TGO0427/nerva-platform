import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId, SiteId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('returns/rmas')
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @Get()
  @RequirePermissions('rma.create')
  @ApiOperation({ summary: 'List RMAs' })
  async list(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listRmas(tenantId, { status, customerId }, page, limit);
  }

  @Get(':id')
  @RequirePermissions('rma.create')
  @ApiOperation({ summary: 'Get RMA with lines' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getRmaWithLines(id);
  }

  @Post()
  @RequirePermissions('rma.create')
  @ApiOperation({ summary: 'Create RMA' })
  async create(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      warehouseId: string;
      customerId: string;
      salesOrderId?: string;
      shipmentId?: string;
      returnType?: string;
      notes?: string;
      lines: Array<{
        itemId: string;
        qtyExpected: number;
        reasonCode: string;
        unitCreditAmount?: number;
        salesOrderLineId?: string;
      }>;
    },
  ) {
    return this.service.createRma({
      tenantId,
      siteId,
      ...data,
      createdBy: user.id,
    });
  }

  @Post(':id/receive')
  @RequirePermissions('rma.receive')
  @ApiOperation({ summary: 'Receive RMA line' })
  async receiveLine(
    @Param('id', UuidValidationPipe) rmaId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      lineId: string;
      qtyReceived: number;
      receivingBinId: string;
    },
  ) {
    return this.service.receiveRmaLine(
      rmaId,
      data.lineId,
      data.qtyReceived,
      data.receivingBinId,
      user.id,
    );
  }

  @Post(':id/disposition')
  @RequirePermissions('rma.disposition')
  @ApiOperation({ summary: 'Set disposition for RMA line' })
  async setDisposition(
    @Param('id', UuidValidationPipe) rmaId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      lineId: string;
      disposition: string;
      dispositionBinId: string;
      inspectionNotes?: string;
    },
  ) {
    return this.service.setLineDisposition(
      rmaId,
      data.lineId,
      data.disposition,
      data.dispositionBinId,
      user.id,
      data.inspectionNotes,
    );
  }
}
