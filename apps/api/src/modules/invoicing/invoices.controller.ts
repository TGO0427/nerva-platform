import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { InvoicingService } from './invoicing.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('invoicing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('finance/invoices')
export class InvoicesController {
  constructor(
    private readonly service: InvoicingService,
    private readonly pdfService: InvoicePdfService,
  ) {}

  @Get()
  @RequirePermissions('invoice.read')
  @ApiOperation({ summary: 'List invoices' })
  async list(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listInvoices(tenantId, { status, customerId }, page, limit);
  }

  @Get('stats')
  @RequirePermissions('invoice.read')
  @ApiOperation({ summary: 'Get invoice stats' })
  async getStats(@TenantId() tenantId: string) {
    return this.service.getStats(tenantId);
  }

  @Get(':id')
  @RequirePermissions('invoice.read')
  @ApiOperation({ summary: 'Get invoice with details' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getInvoiceWithDetails(id);
  }

  @Post('from-order/:salesOrderId')
  @RequirePermissions('invoice.create')
  @ApiOperation({ summary: 'Create invoice from sales order' })
  async createFromSalesOrder(
    @Param('salesOrderId', UuidValidationPipe) salesOrderId: string,
    @TenantId() tenantId: string,
    @Query('siteId') siteId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.createFromSalesOrder(salesOrderId, tenantId, siteId, user.id);
  }

  @Post(':id/send')
  @RequirePermissions('invoice.create')
  @ApiOperation({ summary: 'Send invoice' })
  async send(@Param('id', UuidValidationPipe) id: string) {
    return this.service.sendInvoice(id);
  }

  @Post(':id/payments')
  @RequirePermissions('invoice.create')
  @ApiOperation({ summary: 'Record payment against invoice' })
  async recordPayment(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    body: {
      amount: number;
      paymentDate?: Date;
      paymentMethod?: string;
      reference?: string;
      notes?: string;
    },
  ) {
    return this.service.recordPayment(id, { ...body, recordedBy: user.id });
  }

  @Get(':id/payments')
  @RequirePermissions('invoice.read')
  @ApiOperation({ summary: 'List payments for invoice' })
  async getPayments(@Param('id', UuidValidationPipe) id: string) {
    const invoice = await this.service.getInvoiceWithDetails(id);
    return invoice.payments;
  }

  @Post(':id/cancel')
  @RequirePermissions('invoice.create')
  @ApiOperation({ summary: 'Cancel invoice' })
  async cancel(@Param('id', UuidValidationPipe) id: string) {
    return this.service.cancelInvoice(id);
  }

  @Post(':id/void')
  @RequirePermissions('invoice.create')
  @ApiOperation({ summary: 'Void invoice' })
  async void(@Param('id', UuidValidationPipe) id: string) {
    return this.service.voidInvoice(id);
  }

  @Get(':id/pdf')
  @RequirePermissions('invoice.read')
  @ApiOperation({ summary: 'Download invoice PDF' })
  @ApiProduces('application/pdf')
  async downloadPdf(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.pdfService.generate(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
  }
}
