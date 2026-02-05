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
  CreateCustomerDto,
  UpdateCustomerDto,
  CreateCustomerContactDto,
  UpdateCustomerContactDto,
  CreateCustomerNoteDto,
} from './dto';

@ApiTags('master-data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('masterdata/customers')
export class CustomersController {
  constructor(
    private readonly service: MasterDataService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions('customer.read')
  @ApiOperation({ summary: 'List customers' })
  async list(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.listCustomers(tenantId, { page, limit, search });
  }

  @Get(':id')
  @RequirePermissions('customer.read')
  @ApiOperation({ summary: 'Get customer by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getCustomer(id);
  }

  @Post()
  @RequirePermissions('customer.write')
  @ApiOperation({ summary: 'Create customer' })
  async create(
    @TenantId() tenantId: string,
    @Body() data: CreateCustomerDto,
  ) {
    return this.service.createCustomer({ tenantId, ...data });
  }

  @Patch(':id')
  @RequirePermissions('customer.write')
  @ApiOperation({ summary: 'Update customer' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: UpdateCustomerDto,
  ) {
    return this.service.updateCustomer(id, data);
  }

  // Activity Log
  @Get(':id/activity')
  @RequirePermissions('customer.read')
  @ApiOperation({ summary: 'Get customer activity log' })
  async getActivity(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getEntityHistory(tenantId, 'customer', id, limit || 50, 0);
  }

  // Contacts
  @Get(':id/contacts')
  @RequirePermissions('customer.read')
  @ApiOperation({ summary: 'List customer contacts' })
  async listContacts(@Param('id', UuidValidationPipe) customerId: string) {
    return this.service.listCustomerContacts(customerId);
  }

  @Post(':id/contacts')
  @RequirePermissions('customer.write')
  @ApiOperation({ summary: 'Create customer contact' })
  async createContact(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) customerId: string,
    @Body() data: CreateCustomerContactDto,
  ) {
    return this.service.createCustomerContact({ tenantId, customerId, ...data });
  }

  @Patch('contacts/:contactId')
  @RequirePermissions('customer.write')
  @ApiOperation({ summary: 'Update customer contact' })
  async updateContact(
    @Param('contactId', UuidValidationPipe) contactId: string,
    @Body() data: UpdateCustomerContactDto,
  ) {
    return this.service.updateCustomerContact(contactId, data);
  }

  @Delete('contacts/:contactId')
  @RequirePermissions('customer.write')
  @ApiOperation({ summary: 'Delete customer contact' })
  async deleteContact(@Param('contactId', UuidValidationPipe) contactId: string) {
    await this.service.deleteCustomerContact(contactId);
    return { success: true };
  }

  // Notes
  @Get(':id/notes')
  @RequirePermissions('customer.read')
  @ApiOperation({ summary: 'List customer notes' })
  async listNotes(@Param('id', UuidValidationPipe) customerId: string) {
    return this.service.listCustomerNotes(customerId);
  }

  @Post(':id/notes')
  @RequirePermissions('customer.write')
  @ApiOperation({ summary: 'Create customer note' })
  async createNote(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) customerId: string,
    @Body() data: CreateCustomerNoteDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.createCustomerNote({
      tenantId,
      customerId,
      content: data.content,
      createdBy: user.id,
    });
  }

  @Delete('notes/:noteId')
  @RequirePermissions('customer.write')
  @ApiOperation({ summary: 'Delete customer note' })
  async deleteNote(@Param('noteId', UuidValidationPipe) noteId: string) {
    await this.service.deleteCustomerNote(noteId);
    return { success: true };
  }

  // Analytics
  @Get('analytics/summary')
  @RequirePermissions('customer.read')
  @ApiOperation({ summary: 'Get customer dashboard summary' })
  async getAnalyticsSummary(@TenantId() tenantId: string) {
    return this.service.getCustomerDashboardSummary(tenantId);
  }

  @Get('analytics/performance')
  @RequirePermissions('customer.read')
  @ApiOperation({ summary: 'Get customer performance statistics' })
  async getAnalyticsPerformance(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.getCustomerPerformanceStats(tenantId, {
      page: page || 1,
      limit: limit || 10,
      sortBy: sortBy || 'totalOrderValue',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Get('analytics/sales-trends')
  @RequirePermissions('customer.read')
  @ApiOperation({ summary: 'Get sales order trends by month' })
  async getSalesTrends(
    @TenantId() tenantId: string,
    @Query('months') months?: number,
  ) {
    return this.service.getSalesOrderTrendsByMonth(tenantId, months || 12);
  }
}
