import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { SalesPdfService } from './sales-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId, SiteId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('sales/orders')
export class SalesController {
  constructor(
    private readonly service: SalesService,
    private readonly pdfService: SalesPdfService,
  ) {}

  @Get()
    @RequirePermissions('sales_order.read')
  @ApiOperation({ summary: 'List sales orders' })
  async list(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listOrders(tenantId, { status, customerId }, page, limit);
  }

  @Post('next-number')
    @RequirePermissions('sales_order.create')
  @ApiOperation({ summary: 'Generate next order number' })
  async getNextNumber(@TenantId() tenantId: string) {
    const orderNo = await this.service.getNextOrderNumber(tenantId);
    return { orderNo };
  }

  @Get(':id')
    @RequirePermissions('sales_order.read')
  @ApiOperation({ summary: 'Get sales order with lines' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getOrderWithLines(id);
  }

  @Get(':id/pdf')
  @RequirePermissions('sales_order.read')
  @ApiOperation({ summary: 'Download sales order PDF' })
  @ApiProduces('application/pdf')
  async downloadPdf(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.pdfService.generate(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="sales-order-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
  }

  @Post()
  @RequirePermissions('sales_order.create')
  @ApiOperation({ summary: 'Create sales order' })
  async create(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      warehouseId: string;
      customerId: string;
      orderNo?: string;
      externalRef?: string;
      priority?: number;
      requestedShipDate?: Date;
      shippingAddressLine1?: string;
      shippingCity?: string;
      notes?: string;
      lines: Array<{
        itemId: string;
        qtyOrdered: number;
        unitPrice?: number;
      }>;
    },
  ) {
    if (!siteId) {
      throw new BadRequestException('Please select a site before creating a sales order');
    }
    return this.service.createOrder({
      tenantId,
      siteId,
      ...data,
      createdBy: user.id,
    });
  }

  @Post(':id/confirm')
  @RequirePermissions('sales_order.edit')
  @ApiOperation({ summary: 'Confirm sales order' })
  async confirm(@Param('id', UuidValidationPipe) id: string) {
    return this.service.confirmOrder(id);
  }

  @Post(':id/allocate')
  @RequirePermissions('sales_order.allocate')
  @ApiOperation({ summary: 'Allocate stock to order' })
  async allocate(@Param('id', UuidValidationPipe) id: string) {
    return this.service.allocateOrder(id);
  }

  @Post(':id/cancel')
  @RequirePermissions('sales_order.cancel')
  @ApiOperation({ summary: 'Cancel sales order' })
  async cancel(@Param('id', UuidValidationPipe) id: string) {
    return this.service.cancelOrder(id);
  }

  @Delete(':id')
  @RequirePermissions('sales_order.delete')
  @ApiOperation({ summary: 'Delete sales order (draft only)' })
  async deleteOrder(@Param('id', UuidValidationPipe) id: string) {
    await this.service.deleteOrder(id);
    return { success: true };
  }
}
