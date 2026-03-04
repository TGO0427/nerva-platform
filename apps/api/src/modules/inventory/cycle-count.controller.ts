import {
  Controller,
  Get,
  Post,
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
import { InventoryService } from './inventory.service';
import { CycleCountPdfService } from './cycle-count-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { CreateCycleCountDto, AddCycleCountLineDto, AddCycleCountLinesFromBinDto, RecordCountDto } from './dto/cycle-count.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('inventory/cycle-counts')
export class CycleCountController {
  constructor(
    private readonly service: InventoryService,
    private readonly pdfService: CycleCountPdfService,
  ) {}

  @Get()
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'List cycle counts' })
  async list(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listCycleCounts(tenantId, status, page, limit, search);
  }

  @Get(':id')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Get cycle count by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getCycleCount(id);
  }

  @Post()
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Create cycle count' })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: CreateCycleCountDto,
  ) {
    return this.service.createCycleCount({
      tenantId,
      warehouseId: data.warehouseId,
      isBlind: data.isBlind,
      createdBy: user.id,
    });
  }

  @Get(':id/lines')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Get cycle count lines' })
  async getLines(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getCycleCountLines(id);
  }

  @Post(':id/lines')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Add line to cycle count' })
  async addLine(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: AddCycleCountLineDto,
  ) {
    return this.service.addCycleCountLine(id, { tenantId, ...data });
  }

  @Post(':id/lines/from-bin')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Add all items from a bin to cycle count' })
  async addLinesFromBin(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: AddCycleCountLinesFromBinDto,
  ) {
    return this.service.addCycleCountLinesFromBin(id, { tenantId, binId: data.binId });
  }

  @Post(':id/lines/from-warehouse')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Add all items from warehouse to cycle count' })
  async addLinesFromWarehouse(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.addCycleCountLinesFromWarehouse(id, tenantId);
  }

  @Delete(':id/lines/:lineId')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Remove cycle count line' })
  async removeLine(
    @Param('id', UuidValidationPipe) id: string,
    @Param('lineId', UuidValidationPipe) lineId: string,
  ) {
    await this.service.removeCycleCountLine(id, lineId);
    return { success: true };
  }

  @Post(':id/start')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Start counting' })
  async start(@Param('id', UuidValidationPipe) id: string) {
    return this.service.startCycleCount(id);
  }

  @Post(':id/lines/:lineId/record')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Record counted quantity for a line' })
  async recordCount(
    @Param('id', UuidValidationPipe) id: string,
    @Param('lineId', UuidValidationPipe) lineId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: RecordCountDto,
  ) {
    return this.service.recordCount(lineId, {
      countedQty: data.countedQty,
      countedBy: user.id,
    });
  }

  @Post(':id/complete')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Complete counting' })
  async complete(@Param('id', UuidValidationPipe) id: string) {
    return this.service.completeCycleCount(id);
  }

  @Post(':id/generate-adjustment')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Generate adjustment from variances' })
  async generateAdjustment(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.generateAdjustmentFromCycleCount(id, user.id);
  }

  @Post(':id/close')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Close cycle count' })
  async close(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.closeCycleCount(id, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Cancel cycle count' })
  async cancel(@Param('id', UuidValidationPipe) id: string) {
    return this.service.cancelCycleCount(id);
  }

  @Delete(':id')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Delete cycle count (open only)' })
  async deleteCycleCount(@Param('id', UuidValidationPipe) id: string) {
    await this.service.deleteCycleCount(id);
    return { success: true };
  }

  @Get(':id/count-sheet-pdf')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Download count sheet PDF' })
  @ApiProduces('application/pdf')
  async downloadCountSheet(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.pdfService.generateCountSheet(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="count-sheet-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
  }

  @Get(':id/variance-report-pdf')
  @RequirePermissions('cycle_count.manage')
  @ApiOperation({ summary: 'Download variance report PDF' })
  @ApiProduces('application/pdf')
  async downloadVarianceReport(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.pdfService.generateVarianceReport(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="variance-report-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
  }
}
