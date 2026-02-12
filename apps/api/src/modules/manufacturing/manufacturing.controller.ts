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
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { ManufacturingService } from './manufacturing.service';
import { WorkOrderPdfService } from './work-order-pdf.service';
import { BomPdfService } from './bom-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId, SiteId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('manufacturing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('manufacturing')
export class ManufacturingController {
  constructor(
    private readonly service: ManufacturingService,
    private readonly workOrderPdfService: WorkOrderPdfService,
    private readonly bomPdfService: BomPdfService,
  ) {}

  // ============ Workstations ============
  @Get('workstations')
  @RequirePermissions('workstation.view')
  @ApiOperation({ summary: 'List workstations' })
  async listWorkstations(
    @TenantId() tenantId: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listWorkstations(tenantId, { siteId, status, search }, page, limit);
  }

  @Get('workstations/:id')
  @RequirePermissions('workstation.view')
  @ApiOperation({ summary: 'Get workstation' })
  async getWorkstation(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getWorkstation(id);
  }

  @Post('workstations')
  @RequirePermissions('workstation.create')
  @ApiOperation({ summary: 'Create workstation' })
  async createWorkstation(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @Body() data: {
      code: string;
      name: string;
      description?: string;
      workstationType: string;
      capacityPerHour?: number;
      costPerHour?: number;
    },
  ) {
    return this.service.createWorkstation({ tenantId, siteId, ...data });
  }

  @Patch('workstations/:id')
  @RequirePermissions('workstation.edit')
  @ApiOperation({ summary: 'Update workstation' })
  async updateWorkstation(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: {
      code?: string;
      name?: string;
      description?: string;
      workstationType?: string;
      capacityPerHour?: number;
      costPerHour?: number;
      status?: string;
    },
  ) {
    return this.service.updateWorkstation(id, data);
  }

  @Delete('workstations/:id')
  @RequirePermissions('workstation.delete')
  @ApiOperation({ summary: 'Delete workstation' })
  async deleteWorkstation(@Param('id', UuidValidationPipe) id: string) {
    await this.service.deleteWorkstation(id);
    return { success: true };
  }

  // ============ BOMs ============
  @Get('boms')
  @RequirePermissions('bom.view')
  @ApiOperation({ summary: 'List BOMs' })
  async listBoms(
    @TenantId() tenantId: string,
    @Query('itemId') itemId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listBoms(tenantId, { itemId, status, search }, page, limit);
  }

  @Get('boms/:id')
  @RequirePermissions('bom.view')
  @ApiOperation({ summary: 'Get BOM with lines' })
  async getBom(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getBom(id);
  }

  @Get('boms/:id/pdf')
  @RequirePermissions('bom.view')
  @ApiOperation({ summary: 'Download BOM PDF' })
  @ApiProduces('application/pdf')
  async downloadBomPdf(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.bomPdfService.generate(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bom-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
  }

  @Post('boms')
  @RequirePermissions('bom.create')
  @ApiOperation({ summary: 'Create BOM' })
  async createBom(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: {
      itemId: string;
      baseQty?: number;
      uom?: string;
      effectiveFrom?: Date;
      effectiveTo?: Date;
      notes?: string;
      lines: Array<{
        itemId: string;
        qtyPer: number;
        uom?: string;
        scrapPct?: number;
        isCritical?: boolean;
        notes?: string;
      }>;
    },
  ) {
    return this.service.createBom({ tenantId, createdBy: user.id, ...data });
  }

  @Patch('boms/:id')
  @RequirePermissions('bom.edit')
  @ApiOperation({ summary: 'Update BOM (draft only)' })
  async updateBom(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: {
      revision?: string;
      baseQty?: number;
      uom?: string;
      effectiveFrom?: Date;
      effectiveTo?: Date;
      notes?: string;
    },
  ) {
    return this.service.updateBom(id, data);
  }

  @Delete('boms/:id')
  @RequirePermissions('bom.delete')
  @ApiOperation({ summary: 'Delete BOM (draft only)' })
  async deleteBom(@Param('id', UuidValidationPipe) id: string) {
    await this.service.deleteBom(id);
    return { success: true };
  }

  @Post('boms/:id/new-version')
  @RequirePermissions('bom.create')
  @ApiOperation({ summary: 'Create new BOM version' })
  async createNewBomVersion(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.createNewBomVersion(id, user.id);
  }

  @Post('boms/:id/submit')
  @RequirePermissions('bom.edit')
  @ApiOperation({ summary: 'Submit BOM for approval' })
  async submitBomForApproval(@Param('id', UuidValidationPipe) id: string) {
    return this.service.submitBomForApproval(id);
  }

  @Post('boms/:id/approve')
  @RequirePermissions('bom.approve')
  @ApiOperation({ summary: 'Approve BOM' })
  async approveBom(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.approveBom(id, user.id);
  }

  @Post('boms/:id/obsolete')
  @RequirePermissions('bom.edit')
  @ApiOperation({ summary: 'Mark BOM as obsolete' })
  async obsoleteBom(@Param('id', UuidValidationPipe) id: string) {
    return this.service.obsoleteBom(id);
  }

  @Get('boms/:id/compare/:otherId')
  @RequirePermissions('bom.view')
  @ApiOperation({ summary: 'Compare two BOMs' })
  async compareBoms(
    @Param('id', UuidValidationPipe) id: string,
    @Param('otherId', UuidValidationPipe) otherId: string,
  ) {
    return this.service.compareBoms(id, otherId);
  }

  // BOM Lines
  @Post('boms/:bomId/lines')
  @RequirePermissions('bom.edit')
  @ApiOperation({ summary: 'Add BOM line' })
  async addBomLine(
    @Param('bomId', UuidValidationPipe) bomId: string,
    @Body() data: {
      itemId: string;
      qtyPer: number;
      uom?: string;
      scrapPct?: number;
      isCritical?: boolean;
      notes?: string;
    },
  ) {
    return this.service.addBomLine(bomId, data);
  }

  @Patch('boms/lines/:lineId')
  @RequirePermissions('bom.edit')
  @ApiOperation({ summary: 'Update BOM line' })
  async updateBomLine(
    @Param('lineId', UuidValidationPipe) lineId: string,
    @Body() data: {
      qtyPer?: number;
      uom?: string;
      scrapPct?: number;
      isCritical?: boolean;
      notes?: string;
    },
  ) {
    return this.service.updateBomLine(lineId, data);
  }

  @Delete('boms/lines/:lineId')
  @RequirePermissions('bom.edit')
  @ApiOperation({ summary: 'Delete BOM line' })
  async deleteBomLine(@Param('lineId', UuidValidationPipe) lineId: string) {
    await this.service.deleteBomLine(lineId);
    return { success: true };
  }

  // ============ Routings ============
  @Get('routings')
  @RequirePermissions('routing.view')
  @ApiOperation({ summary: 'List routings' })
  async listRoutings(
    @TenantId() tenantId: string,
    @Query('itemId') itemId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listRoutings(tenantId, { itemId, status, search }, page, limit);
  }

  @Get('routings/:id')
  @RequirePermissions('routing.view')
  @ApiOperation({ summary: 'Get routing with operations' })
  async getRouting(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getRouting(id);
  }

  @Post('routings')
  @RequirePermissions('routing.create')
  @ApiOperation({ summary: 'Create routing' })
  async createRouting(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: {
      itemId: string;
      effectiveFrom?: Date;
      effectiveTo?: Date;
      notes?: string;
      operations: Array<{
        name: string;
        description?: string;
        workstationId?: string;
        setupTimeMins?: number;
        runTimeMins: number;
        queueTimeMins?: number;
        overlapPct?: number;
        isSubcontracted?: boolean;
        instructions?: string;
      }>;
    },
  ) {
    return this.service.createRouting({ tenantId, createdBy: user.id, ...data });
  }

  @Patch('routings/:id')
  @RequirePermissions('routing.edit')
  @ApiOperation({ summary: 'Update routing (draft only)' })
  async updateRouting(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: {
      effectiveFrom?: Date;
      effectiveTo?: Date;
      notes?: string;
    },
  ) {
    return this.service.updateRouting(id, data);
  }

  @Delete('routings/:id')
  @RequirePermissions('routing.delete')
  @ApiOperation({ summary: 'Delete routing (draft only)' })
  async deleteRouting(@Param('id', UuidValidationPipe) id: string) {
    await this.service.deleteRouting(id);
    return { success: true };
  }

  @Post('routings/:id/approve')
  @RequirePermissions('routing.approve')
  @ApiOperation({ summary: 'Approve routing' })
  async approveRouting(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.approveRouting(id, user.id);
  }

  @Post('routings/:id/obsolete')
  @RequirePermissions('routing.edit')
  @ApiOperation({ summary: 'Mark routing as obsolete' })
  async obsoleteRouting(@Param('id', UuidValidationPipe) id: string) {
    return this.service.obsoleteRouting(id);
  }

  // ============ Work Orders ============
  @Get('work-orders')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'List work orders' })
  async listWorkOrders(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listWorkOrders(tenantId, { status, itemId, warehouseId, search }, page, limit);
  }

  @Get('work-orders/:id')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get work order with operations and materials' })
  async getWorkOrder(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getWorkOrder(id);
  }

  @Get('work-orders/:id/pdf')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Download work order PDF' })
  @ApiProduces('application/pdf')
  async downloadWorkOrderPdf(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.workOrderPdfService.generate(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="work-order-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
  }

  @Post('work-orders/next-number')
  @RequirePermissions('work_order.create')
  @ApiOperation({ summary: 'Generate next work order number' })
  async getNextWorkOrderNumber(@TenantId() tenantId: string) {
    const workOrderNo = await this.service.getNextWorkOrderNumber(tenantId);
    return { workOrderNo };
  }

  @Post('work-orders')
  @RequirePermissions('work_order.create')
  @ApiOperation({ summary: 'Create work order' })
  async createWorkOrder(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: {
      warehouseId: string;
      workOrderNo?: string;
      itemId: string;
      bomHeaderId?: string;
      routingId?: string;
      priority?: number;
      qtyOrdered: number;
      plannedStart?: Date;
      plannedEnd?: Date;
      salesOrderId?: string;
      notes?: string;
    },
  ) {
    return this.service.createWorkOrder({ tenantId, siteId, createdBy: user.id, ...data });
  }

  @Patch('work-orders/:id')
  @RequirePermissions('work_order.edit')
  @ApiOperation({ summary: 'Update work order (draft only)' })
  async updateWorkOrder(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: {
      bomHeaderId?: string;
      routingId?: string;
      priority?: number;
      qtyOrdered?: number;
      plannedStart?: Date;
      plannedEnd?: Date;
      notes?: string;
    },
  ) {
    return this.service.updateWorkOrder(id, data);
  }

  @Delete('work-orders/:id')
  @RequirePermissions('work_order.delete')
  @ApiOperation({ summary: 'Delete work order (draft only)' })
  async deleteWorkOrder(@Param('id', UuidValidationPipe) id: string) {
    await this.service.deleteWorkOrder(id);
    return { success: true };
  }

  @Post('work-orders/:id/release')
  @RequirePermissions('work_order.release')
  @ApiOperation({ summary: 'Release work order to floor' })
  async releaseWorkOrder(@Param('id', UuidValidationPipe) id: string) {
    return this.service.releaseWorkOrder(id);
  }

  @Post('work-orders/:id/start')
  @RequirePermissions('work_order.edit')
  @ApiOperation({ summary: 'Start work order production' })
  async startWorkOrder(@Param('id', UuidValidationPipe) id: string) {
    return this.service.startWorkOrder(id);
  }

  @Post('work-orders/:id/complete')
  @RequirePermissions('work_order.complete')
  @ApiOperation({ summary: 'Complete work order' })
  async completeWorkOrder(@Param('id', UuidValidationPipe) id: string) {
    return this.service.completeWorkOrder(id);
  }

  @Post('work-orders/:id/cancel')
  @RequirePermissions('work_order.cancel')
  @ApiOperation({ summary: 'Cancel work order' })
  async cancelWorkOrder(@Param('id', UuidValidationPipe) id: string) {
    return this.service.cancelWorkOrder(id);
  }

  // Work Order Operations
  @Get('work-orders/:woId/operations')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get work order operations' })
  async getWorkOrderOperations(@Param('woId', UuidValidationPipe) woId: string) {
    const wo = await this.service.getWorkOrder(woId);
    return wo.operations;
  }

  @Post('work-orders/:woId/operations/:opId/start')
  @RequirePermissions('work_order.edit')
  @ApiOperation({ summary: 'Start operation' })
  async startOperation(@Param('opId', UuidValidationPipe) opId: string) {
    return this.service.startOperation(opId);
  }

  @Post('work-orders/:woId/operations/:opId/complete')
  @RequirePermissions('work_order.edit')
  @ApiOperation({ summary: 'Complete operation' })
  async completeOperation(
    @Param('opId', UuidValidationPipe) opId: string,
    @Body() data: {
      qtyCompleted: number;
      qtyScrapped?: number;
      setupTimeActual?: number;
      runTimeActual?: number;
      notes?: string;
    },
  ) {
    return this.service.completeOperation(opId, data);
  }

  // Material Issue/Return
  @Post('work-orders/:id/issue-material')
  @RequirePermissions('production.issue_material')
  @ApiOperation({ summary: 'Issue material to work order' })
  async issueMaterial(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: {
      materialId: string;
      qty: number;
      binId: string;
      batchNo?: string;
    },
  ) {
    return this.service.issueMaterial(id, { ...data, operatorId: user.id, createdBy: user.id });
  }

  @Post('work-orders/:id/return-material')
  @RequirePermissions('production.issue_material')
  @ApiOperation({ summary: 'Return material from work order' })
  async returnMaterial(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: {
      materialId: string;
      qty: number;
      binId: string;
      batchNo?: string;
      reasonCode?: string;
    },
  ) {
    return this.service.returnMaterial(id, { ...data, operatorId: user.id, createdBy: user.id });
  }

  @Post('work-orders/:id/record-output')
  @RequirePermissions('production.record_output')
  @ApiOperation({ summary: 'Record production output' })
  async recordOutput(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: {
      qty: number;
      binId: string;
      batchNo?: string;
      operationId?: string;
      workstationId?: string;
      notes?: string;
    },
  ) {
    return this.service.recordOutput(id, { ...data, operatorId: user.id, createdBy: user.id });
  }

  @Post('work-orders/:id/record-scrap')
  @RequirePermissions('production.record_output')
  @ApiOperation({ summary: 'Record scrap' })
  async recordScrap(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: {
      itemId: string;
      qty: number;
      binId?: string;
      batchNo?: string;
      operationId?: string;
      reasonCode?: string;
      notes?: string;
    },
  ) {
    return this.service.recordScrap(id, { ...data, createdBy: user.id });
  }

  // ============ Production Ledger ============
  @Get('production-ledger')
  @RequirePermissions('production.view_ledger')
  @ApiOperation({ summary: 'Query production ledger' })
  async getProductionLedger(
    @TenantId() tenantId: string,
    @Query('workOrderId') workOrderId?: string,
    @Query('itemId') itemId?: string,
    @Query('entryType') entryType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getProductionLedger(
      tenantId,
      {
        workOrderId,
        itemId,
        entryType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      page,
      limit,
    );
  }

  @Get('production-ledger/summary/by-work-order')
  @RequirePermissions('production.view_ledger')
  @ApiOperation({ summary: 'Production summary by work order' })
  async getProductionSummaryByWorkOrder(@TenantId() tenantId: string) {
    return this.service.getProductionSummaryByWorkOrder(tenantId);
  }

  @Get('production-ledger/summary/by-item')
  @RequirePermissions('production.view_ledger')
  @ApiOperation({ summary: 'Production summary by item' })
  async getProductionSummaryByItem(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getProductionSummaryByItem(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
