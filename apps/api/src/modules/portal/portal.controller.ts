import {
  Controller, Get, Post, Param, Query, Body, Req, Res,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CustomerScopeGuard } from '../../common/guards/customer-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { PortalService } from './portal.service';
import { InvoicePdfService } from '../invoicing/invoice-pdf.service';

@ApiTags('portal')
@Controller('portal')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, CustomerScopeGuard)
@ApiBearerAuth()
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  private getCustomerId(user: CurrentUserData, req: Request): string {
    return (req as any).customerId || user.customerId!;
  }

  @Get('dashboard')
  @RequirePermissions('portal.orders.read')
  async dashboard(@CurrentUser() user: CurrentUserData, @Req() req: Request) {
    return this.portalService.getDashboard(user.tenantId, this.getCustomerId(user, req));
  }

  @Get('orders')
  @RequirePermissions('portal.orders.read')
  async listOrders(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.portalService.getOrders(user.tenantId, this.getCustomerId(user, req), page, limit, status);
  }

  @Get('orders/:id')
  @RequirePermissions('portal.orders.read')
  async getOrder(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.portalService.getOrder(user.tenantId, this.getCustomerId(user, req), id);
  }

  @Get('invoices')
  @RequirePermissions('portal.invoices.read')
  async listInvoices(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.portalService.getInvoices(user.tenantId, this.getCustomerId(user, req), page, limit, status);
  }

  @Get('invoices/:id')
  @RequirePermissions('portal.invoices.read')
  async getInvoice(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.portalService.getInvoice(user.tenantId, this.getCustomerId(user, req), id);
  }

  @Get('invoices/:id/pdf')
  @RequirePermissions('portal.invoices.download')
  async downloadInvoice(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    // Verify ownership
    await this.portalService.getInvoice(user.tenantId, this.getCustomerId(user, req), id);
    const buffer = await this.invoicePdfService.generate(id, user.tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
    });
    res.send(buffer);
  }

  @Get('deliveries')
  @RequirePermissions('portal.tracking.read')
  async listDeliveries(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.portalService.getDeliveries(user.tenantId, this.getCustomerId(user, req), page, limit);
  }

  @Get('deliveries/:stopId')
  @RequirePermissions('portal.tracking.read')
  async getDelivery(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Param('stopId') stopId: string,
  ) {
    return this.portalService.getDelivery(user.tenantId, this.getCustomerId(user, req), stopId);
  }

  @Get('deliveries/:stopId/pod')
  @RequirePermissions('portal.pod.read')
  async getPod(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Param('stopId') stopId: string,
  ) {
    return this.portalService.getPod(user.tenantId, this.getCustomerId(user, req), stopId);
  }

  @Get('deliveries/:stopId/pod/download/:docId')
  @RequirePermissions('portal.pod.download')
  async downloadPodDoc(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Param('stopId') stopId: string,
    @Param('docId') docId: string,
  ) {
    return this.portalService.getPodDocumentUrl(user.tenantId, this.getCustomerId(user, req), stopId, docId);
  }

  @Get('returns')
  @RequirePermissions('portal.returns.read')
  async listReturns(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.portalService.getReturns(user.tenantId, this.getCustomerId(user, req), page, limit);
  }

  @Get('returns/:id')
  @RequirePermissions('portal.returns.read')
  async getReturn(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.portalService.getReturn(user.tenantId, this.getCustomerId(user, req), id);
  }

  @Post('returns')
  @RequirePermissions('portal.returns.create')
  async createReturn(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Body() body: {
      salesOrderId?: string;
      returnType: string;
      reason: string;
      notes?: string;
      lines: Array<{ itemId: string; qtyRequested: number }>;
    },
  ) {
    return this.portalService.createReturn(
      user.tenantId,
      this.getCustomerId(user, req),
      user.id,
      body,
    );
  }
}
