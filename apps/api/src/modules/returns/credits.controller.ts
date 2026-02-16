import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreditNotePdfService } from './credit-note-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('finance/credits')
export class CreditsController {
  constructor(
    private readonly service: ReturnsService,
    private readonly pdfService: CreditNotePdfService,
  ) {}

  @Get()
  @RequirePermissions('credit.create')
  @ApiOperation({ summary: 'List credit notes' })
  async list(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listCreditNotes(tenantId, status, page, limit);
  }

  @Get(':id')
  @RequirePermissions('credit.create')
  @ApiOperation({ summary: 'Get credit note' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getCreditNote(id);
  }

  @Get(':id/pdf')
  @RequirePermissions('credit.create')
  @ApiOperation({ summary: 'Download credit note PDF' })
  @ApiProduces('application/pdf')
  async downloadPdf(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.pdfService.generate(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="credit-note-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
  }

  @Post('from-rma/:rmaId')
  @RequirePermissions('credit.create')
  @ApiOperation({ summary: 'Create credit note from RMA' })
  async createFromRma(
    @Param('rmaId', UuidValidationPipe) rmaId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.createCreditNote(rmaId, user.id);
  }

  @Delete(':id')
  @RequirePermissions('credit.delete')
  @ApiOperation({ summary: 'Delete credit note (DRAFT only)' })
  async deleteCreditNote(@Param('id', UuidValidationPipe) id: string) {
    await this.service.deleteCreditNote(id);
    return { success: true };
  }

  @Post(':id/approve')
  @RequirePermissions('credit.approve')
  @ApiOperation({ summary: 'Approve credit note' })
  async approve(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.approveCreditNote(id, user.id);
  }
}
