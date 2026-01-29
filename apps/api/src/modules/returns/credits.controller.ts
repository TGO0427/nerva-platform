import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
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
  constructor(private readonly service: ReturnsService) {}

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

  @Post('from-rma/:rmaId')
  @RequirePermissions('credit.create')
  @ApiOperation({ summary: 'Create credit note from RMA' })
  async createFromRma(
    @Param('rmaId', UuidValidationPipe) rmaId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.createCreditNote(rmaId, user.id);
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
