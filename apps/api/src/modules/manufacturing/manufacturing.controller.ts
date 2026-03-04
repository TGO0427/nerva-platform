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
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { ManufacturingService } from './manufacturing.service';
import { WorkOrderPdfService } from './work-order-pdf.service';
import { BomPdfService } from './bom-pdf.service';
import { BatchSheetPdfService } from './batch-sheet-pdf.service';
import { ProductionTicketPdfService } from './production-ticket-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId, SiteId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import {
  CreateWorkstationDto,
  UpdateWorkstationDto,
  CreateBomDto,
  UpdateBomDto,
  AddBomLineDto,
  UpdateBomLineDto,
  CreateRoutingDto,
  UpdateRoutingDto,
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  UpsertWorkOrderChecksDto,
  UpsertWorkOrderProcessDto,
  CompleteOperationDto,
  IssueMaterialDto,
  ReturnMaterialDto,
  RecordOutputDto,
  RecordScrapDto,
  RescheduleWorkOrderDto,
  CreateNonConformanceDto,
  UpdateNonConformanceDto,
  ResolveNonConformanceDto,
} from './dto/manufacturing.dto';
import { ImportWorkOrdersDto } from './dto/wo-import.dto';
import type { ImportResult } from '../masterdata/dto/import.dto';

@ApiTags('manufacturing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('manufacturing')
export class ManufacturingController {
  constructor(
    private readonly service: ManufacturingService,
    private readonly workOrderPdfService: WorkOrderPdfService,
    private readonly bomPdfService: BomPdfService,
    private readonly batchSheetPdfService: BatchSheetPdfService,
    private readonly productionTicketPdfService: ProductionTicketPdfService,
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
    @Body() data: CreateWorkstationDto,
  ) {
    return this.service.createWorkstation({ tenantId, siteId, ...data });
  }

  @Patch('workstations/:id')
  @RequirePermissions('workstation.edit')
  @ApiOperation({ summary: 'Update workstation' })
  async updateWorkstation(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: UpdateWorkstationDto,
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
    @Body() data: CreateBomDto,
  ) {
    return this.service.createBom({ tenantId, createdBy: user.id, ...data });
  }

  @Patch('boms/:id')
  @RequirePermissions('bom.edit')
  @ApiOperation({ summary: 'Update BOM (draft only)' })
  async updateBom(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: UpdateBomDto,
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

  @Get('boms/:id/explode')
  @RequirePermissions('bom.view')
  @ApiOperation({ summary: 'Explode BOM with scaled quantities' })
  async explodeBom(
    @Param('id', UuidValidationPipe) id: string,
    @Query('requiredKg') requiredKg: string,
  ) {
    const qty = parseFloat(requiredKg);
    if (!qty || qty <= 0) {
      throw new BadRequestException('requiredKg must be a positive number');
    }
    return this.service.explodeBom(id, qty);
  }

  // BOM Lines
  @Post('boms/:bomId/lines')
  @RequirePermissions('bom.edit')
  @ApiOperation({ summary: 'Add BOM line' })
  async addBomLine(
    @Param('bomId', UuidValidationPipe) bomId: string,
    @Body() data: AddBomLineDto,
  ) {
    return this.service.addBomLine(bomId, data);
  }

  @Patch('boms/lines/:lineId')
  @RequirePermissions('bom.edit')
  @ApiOperation({ summary: 'Update BOM line' })
  async updateBomLine(
    @Param('lineId', UuidValidationPipe) lineId: string,
    @Body() data: UpdateBomLineDto,
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
    @Body() data: CreateRoutingDto,
  ) {
    return this.service.createRouting({ tenantId, createdBy: user.id, ...data });
  }

  @Patch('routings/:id')
  @RequirePermissions('routing.edit')
  @ApiOperation({ summary: 'Update routing (draft only)' })
  async updateRouting(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: UpdateRoutingDto,
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

  @Post('work-orders/import')
  @RequirePermissions('work_order.create')
  @ApiOperation({ summary: 'Bulk import work orders from spreadsheet' })
  async importWorkOrders(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: ImportWorkOrdersDto,
  ): Promise<ImportResult> {
    if (!siteId) {
      throw new BadRequestException('Please select a site before importing work orders');
    }
    return this.service.importWorkOrders(tenantId, siteId, user.id, data.rows);
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

  @Get('work-orders/:id/batch-sheet-pdf')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Download production batch sheet PDF' })
  @ApiProduces('application/pdf')
  async downloadBatchSheetPdf(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Query('prefill') prefill: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const isPrefill = prefill === 'true';
    const pdfBuffer = await this.batchSheetPdfService.generate(id, tenantId, isPrefill);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="batch-sheet-${id}.pdf"`,
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
    @Body() data: CreateWorkOrderDto,
  ) {
    return this.service.createWorkOrder({ tenantId, siteId, createdBy: user.id, ...data });
  }

  @Patch('work-orders/:id')
  @RequirePermissions('work_order.edit')
  @ApiOperation({ summary: 'Update work order (draft only)' })
  async updateWorkOrder(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: UpdateWorkOrderDto,
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

  @Post('work-orders/:id/reopen')
  @RequirePermissions('work_order.edit')
  @ApiOperation({ summary: 'Reopen completed work order' })
  async reopenWorkOrder(@Param('id', UuidValidationPipe) id: string) {
    return this.service.reopenWorkOrder(id);
  }

  // Work Order Checks
  @Get('work-orders/:id/checks')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get work order checks' })
  async getWorkOrderChecks(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getWorkOrderChecks(id);
  }

  @Post('work-orders/:id/checks')
  @RequirePermissions('production.capture_checks')
  @ApiOperation({ summary: 'Upsert work order checks' })
  async upsertWorkOrderChecks(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Body() data: UpsertWorkOrderChecksDto,
  ) {
    return this.service.upsertWorkOrderChecks(id, tenantId, data);
  }

  // Work Order Process
  @Get('work-orders/:id/process')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get work order process data' })
  async getWorkOrderProcess(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getWorkOrderProcess(id);
  }

  @Post('work-orders/:id/process')
  @RequirePermissions('production.capture_process')
  @ApiOperation({ summary: 'Upsert work order process data' })
  async upsertWorkOrderProcess(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Body() data: UpsertWorkOrderProcessDto,
  ) {
    return this.service.upsertWorkOrderProcess(id, tenantId, data);
  }

  // Production Ticket PDF
  @Get('work-orders/:id/production-ticket-pdf')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Download 3-page production ticket PDF' })
  @ApiProduces('application/pdf')
  async downloadProductionTicketPdf(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.productionTicketPdfService.generate(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="production-ticket-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
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
    @Body() data: CompleteOperationDto,
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
    @Body() data: IssueMaterialDto,
  ) {
    return this.service.issueMaterial(id, { ...data, operatorId: user.id, createdBy: user.id });
  }

  @Post('work-orders/:id/return-material')
  @RequirePermissions('production.issue_material')
  @ApiOperation({ summary: 'Return material from work order' })
  async returnMaterial(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: ReturnMaterialDto,
  ) {
    return this.service.returnMaterial(id, { ...data, operatorId: user.id, createdBy: user.id });
  }

  @Post('work-orders/:id/record-output')
  @RequirePermissions('production.record_output')
  @ApiOperation({ summary: 'Record production output' })
  async recordOutput(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: RecordOutputDto,
  ) {
    return this.service.recordOutput(id, { ...data, operatorId: user.id, createdBy: user.id });
  }

  @Post('work-orders/:id/record-scrap')
  @RequirePermissions('production.record_output')
  @ApiOperation({ summary: 'Record scrap' })
  async recordScrap(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: RecordScrapDto,
  ) {
    return this.service.recordScrap(id, { ...data, createdBy: user.id });
  }

  // ============ Dashboard ============
  @Get('dashboard')
  @RequirePermissions('production.view_ledger')
  @ApiOperation({ summary: 'Get manufacturing dashboard stats' })
  async getDashboardStats(@TenantId() tenantId: string) {
    return this.service.getDashboardStats(tenantId);
  }

  // ============ Reports ============
  @Get('reports')
  @RequirePermissions('production.view_ledger')
  @ApiOperation({ summary: 'Get manufacturing report' })
  async getManufacturingReport(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getManufacturingReport(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ============ Traceability ============
  @Get('traceability/recent')
  @RequirePermissions('production.view_ledger')
  @ApiOperation({ summary: 'Get recent batch numbers' })
  async getRecentBatches(@TenantId() tenantId: string) {
    return this.service.getRecentBatches(tenantId);
  }

  @Get('traceability/:batchNo')
  @RequirePermissions('production.view_ledger')
  @ApiOperation({ summary: 'Trace batch/lot' })
  async traceByBatch(
    @TenantId() tenantId: string,
    @Param('batchNo') batchNo: string,
  ) {
    return this.service.traceByBatch(tenantId, batchNo);
  }

  @Get('traceability/:batchNo/forward')
  @RequirePermissions('production.view_ledger')
  @ApiOperation({ summary: 'Forward trace from raw material batch' })
  async forwardTrace(
    @TenantId() tenantId: string,
    @Param('batchNo') batchNo: string,
  ) {
    return this.service.forwardTrace(tenantId, batchNo);
  }

  @Get('traceability/:batchNo/backward')
  @RequirePermissions('production.view_ledger')
  @ApiOperation({ summary: 'Backward trace from finished goods batch' })
  async backwardTrace(
    @TenantId() tenantId: string,
    @Param('batchNo') batchNo: string,
  ) {
    return this.service.backwardTrace(tenantId, batchNo);
  }

  // ============ MRP ============
  @Get('mrp')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Calculate MRP requirements' })
  async getMrpRequirements(@TenantId() tenantId: string) {
    return this.service.getMrpRequirements(tenantId);
  }

  // ============ Scheduling ============
  @Patch('work-orders/:id/reschedule')
  @RequirePermissions('work_order.edit')
  @ApiOperation({ summary: 'Reschedule work order dates' })
  async rescheduleWorkOrder(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: RescheduleWorkOrderDto,
  ) {
    return this.service.rescheduleWorkOrder(id, data);
  }

  // ============ Non-Conformances ============
  @Get('non-conformances')
  @RequirePermissions('quality.view')
  @ApiOperation({ summary: 'List non-conformances' })
  async listNonConformances(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('workOrderId') workOrderId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listNonConformances(tenantId, { status, severity, workOrderId, search }, page, limit);
  }

  @Get('non-conformances/:id')
  @RequirePermissions('quality.view')
  @ApiOperation({ summary: 'Get non-conformance detail' })
  async getNonConformance(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getNonConformance(id);
  }

  @Post('non-conformances')
  @RequirePermissions('quality.create')
  @ApiOperation({ summary: 'Create non-conformance' })
  async createNonConformance(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: CreateNonConformanceDto,
  ) {
    return this.service.createNonConformance({ tenantId, reportedBy: user.id, ...data });
  }

  @Patch('non-conformances/:id')
  @RequirePermissions('quality.edit')
  @ApiOperation({ summary: 'Update non-conformance' })
  async updateNonConformance(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: UpdateNonConformanceDto,
  ) {
    return this.service.updateNonConformance(id, data);
  }

  @Post('non-conformances/:id/resolve')
  @RequirePermissions('quality.resolve')
  @ApiOperation({ summary: 'Resolve non-conformance with disposition' })
  async resolveNonConformance(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: ResolveNonConformanceDto,
  ) {
    return this.service.resolveNonConformance(id, { ...data, resolvedBy: user.id });
  }

  @Post('non-conformances/:id/close')
  @RequirePermissions('quality.resolve')
  @ApiOperation({ summary: 'Close non-conformance' })
  async closeNonConformance(@Param('id', UuidValidationPipe) id: string) {
    return this.service.closeNonConformance(id);
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
