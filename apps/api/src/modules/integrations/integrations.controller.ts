import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { PostingQueueService } from './posting-queue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly postingQueueService: PostingQueueService,
  ) {}

  @Get()
  @RequirePermissions('integration.manage')
  @ApiOperation({ summary: 'List integration connections' })
  async listConnections(@TenantId() tenantId: string) {
    return this.integrationsService.listConnections(tenantId);
  }

  @Post(':type/connect')
  @RequirePermissions('integration.manage')
  @ApiOperation({ summary: 'Create and connect integration' })
  async connect(
    @TenantId() tenantId: string,
    @Param('type') type: string,
    @Body() data: { name: string; authData?: Record<string, unknown> },
  ) {
    const connection = await this.integrationsService.createConnection({
      tenantId,
      type,
      name: data.name,
    });

    if (data.authData) {
      return this.integrationsService.connect(connection.id, data.authData);
    }

    return connection;
  }

  @Get(':id')
  @RequirePermissions('integration.manage')
  @ApiOperation({ summary: 'Get integration connection' })
  async getConnection(@Param('id', UuidValidationPipe) id: string) {
    return this.integrationsService.getConnection(id);
  }

  @Post(':id/disconnect')
  @RequirePermissions('integration.manage')
  @ApiOperation({ summary: 'Disconnect integration' })
  async disconnect(@Param('id', UuidValidationPipe) id: string) {
    return this.integrationsService.disconnect(id);
  }

  @Get('posting-queue')
  @RequirePermissions('posting.view')
  @ApiOperation({ summary: 'List posting queue' })
  async listQueue(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.postingQueueService.listQueue(tenantId, status, page, limit);
  }

  @Post('post/:docType/:docId')
  @RequirePermissions('posting.retry')
  @ApiOperation({ summary: 'Post document to integration' })
  async postDocument(
    @TenantId() tenantId: string,
    @Param('docType') docType: string,
    @Param('docId', UuidValidationPipe) docId: string,
    @Body() data: { integrationId: string; payload: Record<string, unknown> },
  ) {
    // Enqueue the document
    const queueItem = await this.postingQueueService.enqueue({
      tenantId,
      integrationId: data.integrationId,
      docType,
      docId,
      payload: data.payload,
    });

    // Try to post immediately
    await this.postingQueueService.processItem(queueItem.id);
    const result = await this.postingQueueService.postDocument(
      data.integrationId,
      docType,
      docId,
      data.payload,
    );

    if (result.success) {
      await this.postingQueueService.markSuccess(queueItem.id, result.externalRef);
    } else {
      await this.postingQueueService.markFailed(queueItem.id, result.error || 'Unknown error');
    }

    return { ...result, queueItemId: queueItem.id };
  }

  @Post('posting-queue/:id/retry')
  @RequirePermissions('posting.retry')
  @ApiOperation({ summary: 'Retry failed posting' })
  async retryPosting(@Param('id', UuidValidationPipe) id: string) {
    return this.postingQueueService.retry(id);
  }
}
