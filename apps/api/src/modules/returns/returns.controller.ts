import {
  Controller,
  Get,
  Post,
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
import { ReturnsService } from './returns.service';
import { RmaPdfService } from './rma-pdf.service';
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
  constructor(
    private readonly service: ReturnsService,
    private readonly rmaPdfService: RmaPdfService,
  ) {}

  @Get()
    @RequirePermissions('rma.create')
  @ApiOperation({ summary: 'List RMAs' })
  async list(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listRmas(tenantId, siteId, { status, customerId }, page, limit);
  }

  @Get(':id')
    @RequirePermissions('rma.create')
  @ApiOperation({ summary: 'Get RMA with lines' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getRmaWithLines(id);
  }

  @Get(':id/pdf')
  @RequirePermissions('rma.create')
  @ApiOperation({ summary: 'Download RMA PDF' })
  @ApiProduces('application/pdf')
  async downloadPdf(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.rmaPdfService.generate(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rma-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
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
    if (!siteId) {
      throw new BadRequestException('Please select a site before creating an RMA');
    }
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
