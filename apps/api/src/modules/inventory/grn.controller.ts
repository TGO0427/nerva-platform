import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { GrnPdfService } from './grn-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId, SiteId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('receiving/grns')
export class GrnController {
  constructor(
    private readonly service: InventoryService,
    private readonly pdfService: GrnPdfService,
  ) {}

  @Get()
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'List GRNs' })
  async list(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listGrns(tenantId, status, page, limit);
  }

  @Get(':id')
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'Get GRN by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getGrn(id);
  }

  @Get(':id/pdf')
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'Download GRN PDF' })
  @ApiProduces('application/pdf')
  async downloadPdf(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.pdfService.generate(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="grn-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
  }

  @Post()
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'Create GRN' })
  async create(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      warehouseId: string;
      purchaseOrderId?: string;
      supplierId?: string;
      notes?: string;
    },
  ) {
    return this.service.createGrn({
      tenantId,
      siteId,
      ...data,
      createdBy: user.id,
    });
  }

  @Get(':id/lines')
  @RequirePermissions('grn.receive')
  @ApiOperation({ summary: 'Get GRN lines' })
  async getLines(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getGrnLines(id);
  }

  @Post(':id/scan')
  @RequirePermissions('grn.receive')
  @ApiOperation({ summary: 'Receive/scan item into GRN' })
  async scanItem(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) grnId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      itemId: string;
      qtyReceived: number;
      batchNo?: string;
      expiryDate?: string;
      receivingBinId: string;
    },
  ) {
    return this.service.receiveGrnLine(grnId, {
      tenantId,
      itemId: data.itemId,
      qtyReceived: data.qtyReceived,
      batchNo: data.batchNo,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      receivingBinId: data.receivingBinId,
      createdBy: user.id,
    });
  }

  @Post(':id/complete')
  @RequirePermissions('grn.receive')
  @ApiOperation({ summary: 'Complete GRN' })
  async complete(@Param('id', UuidValidationPipe) id: string) {
    return this.service.completeGrn(id);
  }

  @Post(':id/generate-putaway')
  @RequirePermissions('grn.receive')
  @ApiOperation({ summary: 'Generate putaway tasks from GRN lines' })
  async generatePutaway(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.generatePutawayTasks(id, tenantId);
  }

  @Get(':id/putaway-tasks')
  @RequirePermissions('grn.receive')
  @ApiOperation({ summary: 'Get putaway tasks for this GRN' })
  async getPutawayTasks(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getPutawayTasksByGrn(id);
  }
}
