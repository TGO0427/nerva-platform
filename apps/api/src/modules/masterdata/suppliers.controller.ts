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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDataService } from './masterdata.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  CreateSupplierContactDto,
  UpdateSupplierContactDto,
  CreateSupplierNoteDto,
  CreateSupplierNcrDto,
  ResolveSupplierNcrDto,
  CreateSupplierItemDto,
  UpdateSupplierItemDto,
  CreateSupplierContractDto,
  UpdateSupplierContractDto,
} from './dto';

@ApiTags('master-data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('masterdata/suppliers')
export class SuppliersController {
  constructor(
    private readonly service: MasterDataService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'List suppliers' })
  async list(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.listSuppliers(tenantId, { page, limit, search });
  }

  @Get(':id')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'Get supplier by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getSupplier(id);
  }

  @Post()
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Create supplier' })
  async create(
    @TenantId() tenantId: string,
    @Body() data: CreateSupplierDto,
  ) {
    return this.service.createSupplier({ tenantId, ...data });
  }

  @Patch(':id')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Update supplier' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: UpdateSupplierDto,
  ) {
    return this.service.updateSupplier(id, data);
  }

  @Delete(':id')
  @RequirePermissions('supplier.delete')
  @ApiOperation({ summary: 'Delete supplier (no references)' })
  async delete(@Param('id', UuidValidationPipe) id: string) {
    await this.service.deleteSupplier(id);
    return { success: true };
  }

  // Activity Log
  @Get(':id/activity')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'Get supplier activity log' })
  async getActivity(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getEntityHistory(tenantId, 'supplier', id, limit || 50, 0);
  }

  // Contacts
  @Get(':id/contacts')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'List supplier contacts' })
  async listContacts(@Param('id', UuidValidationPipe) supplierId: string) {
    return this.service.listSupplierContacts(supplierId);
  }

  @Post(':id/contacts')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Create supplier contact' })
  async createContact(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) supplierId: string,
    @Body() data: CreateSupplierContactDto,
  ) {
    return this.service.createSupplierContact({ tenantId, supplierId, ...data });
  }

  @Patch('contacts/:contactId')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Update supplier contact' })
  async updateContact(
    @Param('contactId', UuidValidationPipe) contactId: string,
    @Body() data: UpdateSupplierContactDto,
  ) {
    return this.service.updateSupplierContact(contactId, data);
  }

  @Delete('contacts/:contactId')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Delete supplier contact' })
  async deleteContact(@Param('contactId', UuidValidationPipe) contactId: string) {
    await this.service.deleteSupplierContact(contactId);
    return { success: true };
  }

  // Notes
  @Get(':id/notes')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'List supplier notes' })
  async listNotes(@Param('id', UuidValidationPipe) supplierId: string) {
    return this.service.listSupplierNotes(supplierId);
  }

  @Post(':id/notes')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Create supplier note' })
  async createNote(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) supplierId: string,
    @Body() data: CreateSupplierNoteDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.createSupplierNote({
      tenantId,
      supplierId,
      content: data.content,
      createdBy: user.id,
    });
  }

  @Delete('notes/:noteId')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Delete supplier note' })
  async deleteNote(@Param('noteId', UuidValidationPipe) noteId: string) {
    await this.service.deleteSupplierNote(noteId);
    return { success: true };
  }

  // NCRs
  @Get(':id/ncrs')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'List supplier NCRs' })
  async listNcrs(@Param('id', UuidValidationPipe) supplierId: string) {
    return this.service.listSupplierNcrs(supplierId);
  }

  @Post(':id/ncrs')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Create supplier NCR' })
  async createNcr(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) supplierId: string,
    @Body() data: CreateSupplierNcrDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.createSupplierNcr({
      tenantId,
      supplierId,
      ncrType: data.ncrType,
      description: data.description,
      createdBy: user.id,
    });
  }

  @Get('ncrs/:ncrId')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'Get supplier NCR by ID' })
  async getNcr(@Param('ncrId', UuidValidationPipe) ncrId: string) {
    return this.service.getSupplierNcr(ncrId);
  }

  @Post('ncrs/:ncrId/resolve')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Resolve supplier NCR' })
  async resolveNcr(
    @Param('ncrId', UuidValidationPipe) ncrId: string,
    @Body() data: ResolveSupplierNcrDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.resolveSupplierNcr(ncrId, {
      resolution: data.resolution,
      resolvedBy: user.id,
    });
  }

  // Supplier Items (Products & Services)
  @Get(':id/items')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'List supplier items' })
  async listItems(@Param('id', UuidValidationPipe) supplierId: string) {
    return this.service.listSupplierItems(supplierId);
  }

  @Post(':id/items')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Add item to supplier' })
  async addItem(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) supplierId: string,
    @Body() data: CreateSupplierItemDto,
  ) {
    return this.service.createSupplierItem({ tenantId, supplierId, ...data });
  }

  @Patch('items/:itemId')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Update supplier item' })
  async updateItem(
    @Param('itemId', UuidValidationPipe) itemId: string,
    @Body() data: UpdateSupplierItemDto,
  ) {
    return this.service.updateSupplierItem(itemId, data);
  }

  @Delete('items/:itemId')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Remove item from supplier' })
  async removeItem(@Param('itemId', UuidValidationPipe) itemId: string) {
    await this.service.deleteSupplierItem(itemId);
    return { success: true };
  }

  // Supplier Contracts
  @Get(':id/contracts')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'List supplier contracts' })
  async listContracts(@Param('id', UuidValidationPipe) supplierId: string) {
    return this.service.listSupplierContracts(supplierId);
  }

  @Post(':id/contracts')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Create supplier contract' })
  async createContract(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) supplierId: string,
    @Body() data: CreateSupplierContractDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.createSupplierContract({
      tenantId,
      supplierId,
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      terms: data.terms,
      totalValue: data.totalValue,
      currency: data.currency,
      createdBy: user.id,
    });
  }

  @Get('contracts/:contractId')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'Get supplier contract by ID' })
  async getContract(@Param('contractId', UuidValidationPipe) contractId: string) {
    return this.service.getSupplierContract(contractId);
  }

  @Patch('contracts/:contractId')
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Update supplier contract' })
  async updateContract(
    @Param('contractId', UuidValidationPipe) contractId: string,
    @Body() data: UpdateSupplierContractDto,
  ) {
    return this.service.updateSupplierContract(contractId, {
      name: data.name,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      terms: data.terms,
      totalValue: data.totalValue,
    });
  }

  // Analytics
  @Get('analytics/summary')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'Get supplier dashboard summary' })
  async getAnalyticsSummary(@TenantId() tenantId: string) {
    return this.service.getSupplierDashboardSummary(tenantId);
  }

  @Get('analytics/performance')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'Get supplier performance statistics' })
  async getAnalyticsPerformance(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.getSupplierPerformanceStats(tenantId, {
      page: page || 1,
      limit: limit || 10,
      sortBy: sortBy || 'totalPOValue',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Get('analytics/ncr-trends')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'Get NCR trends by month' })
  async getNcrTrends(
    @TenantId() tenantId: string,
    @Query('months') months?: number,
  ) {
    return this.service.getNcrTrendsByMonth(tenantId, months || 12);
  }

  @Get('analytics/po-trends')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'Get purchase order trends by month' })
  async getPoTrends(
    @TenantId() tenantId: string,
    @Query('months') months?: number,
  ) {
    return this.service.getPurchaseOrderTrendsByMonth(tenantId, months || 12);
  }
}
