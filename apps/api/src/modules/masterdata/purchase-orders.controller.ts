import {
  Controller,
  Get,
  Post,
  Patch,
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
import { MasterDataService } from './masterdata.service';
import { PurchaseOrderPdfService } from './purchase-order-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId, SiteId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  CreatePurchaseOrderLineDto,
  UpdatePurchaseOrderLineDto,
} from './dto';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(
    private readonly service: MasterDataService,
    private readonly pdfService: PurchaseOrderPdfService,
  ) {}

  @Get()
    @RequirePermissions('purchase_order.read')
  @ApiOperation({ summary: 'List purchase orders' })
  async list(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listPurchaseOrders(tenantId, siteId, { page, limit, status, supplierId, search });
  }

  @Get(':id')
    @RequirePermissions('purchase_order.read')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getPurchaseOrder(id);
  }

  @Get(':id/pdf')
  @RequirePermissions('purchase_order.read')
  @ApiOperation({ summary: 'Download purchase order PDF' })
  @ApiProduces('application/pdf')
  async downloadPdf(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.pdfService.generate(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="purchase-order-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
  }

  @Post()
  @RequirePermissions('purchase_order.write')
  @ApiOperation({ summary: 'Create purchase order' })
  async create(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @Body() data: CreatePurchaseOrderDto,
    @CurrentUser() user: { id: string },
  ) {
    if (!siteId) {
      throw new BadRequestException('Please select a site before creating a purchase order');
    }
    return this.service.createPurchaseOrder({
      tenantId,
      siteId,
      supplierId: data.supplierId,
      orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
      shipToWarehouseId: data.shipToWarehouseId,
      notes: data.notes,
      createdBy: user.id,
    });
  }

  @Patch(':id')
  @RequirePermissions('purchase_order.write')
  @ApiOperation({ summary: 'Update purchase order' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: UpdatePurchaseOrderDto,
  ) {
    return this.service.updatePurchaseOrder(id, {
      ...data,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
    });
  }

  @Patch(':id/status')
  @RequirePermissions('purchase_order.write')
  @ApiOperation({ summary: 'Update purchase order status' })
  async updateStatus(
    @Param('id', UuidValidationPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.service.updatePurchaseOrder(id, { status });
  }

  // Lines
  @Get(':id/lines')
    @RequirePermissions('purchase_order.read')
  @ApiOperation({ summary: 'List purchase order lines' })
  async listLines(@Param('id', UuidValidationPipe) purchaseOrderId: string) {
    return this.service.listPurchaseOrderLines(purchaseOrderId);
  }

  @Post(':id/lines')
  @RequirePermissions('purchase_order.write')
  @ApiOperation({ summary: 'Add line to purchase order' })
  async addLine(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) purchaseOrderId: string,
    @Body() data: CreatePurchaseOrderLineDto,
  ) {
    const line = await this.service.createPurchaseOrderLine({
      tenantId,
      purchaseOrderId,
      itemId: data.itemId,
      qtyOrdered: data.qtyOrdered,
      unitCost: data.unitCost,
    });
    // Recalculate totals after adding line
    await this.service.recalculatePurchaseOrderTotals(purchaseOrderId);
    return line;
  }

  @Patch('lines/:lineId')
  @RequirePermissions('purchase_order.write')
  @ApiOperation({ summary: 'Update purchase order line' })
  async updateLine(
    @Param('lineId', UuidValidationPipe) lineId: string,
    @Body() data: UpdatePurchaseOrderLineDto,
  ) {
    const line = await this.service.updatePurchaseOrderLine(lineId, data);
    // Recalculate totals after updating line
    await this.service.recalculatePurchaseOrderTotals(line.purchaseOrderId);
    return line;
  }

  @Delete('lines/:lineId')
  @RequirePermissions('purchase_order.write')
  @ApiOperation({ summary: 'Delete purchase order line' })
  async deleteLine(
    @Param('lineId', UuidValidationPipe) lineId: string,
    @Query('purchaseOrderId', UuidValidationPipe) purchaseOrderId: string,
  ) {
    await this.service.deletePurchaseOrderLine(lineId);
    // Recalculate totals after deleting line
    await this.service.recalculatePurchaseOrderTotals(purchaseOrderId);
    return { success: true };
  }

  @Delete(':id')
  @RequirePermissions('purchase_order.delete')
  @ApiOperation({ summary: 'Delete purchase order (draft only)' })
  async deleteOrder(@Param('id', UuidValidationPipe) id: string) {
    await this.service.deletePurchaseOrder(id);
    return { success: true };
  }
}
