import { Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationsRepository, PostingQueueItem } from './integrations.repository';
import { buildPaginatedResult } from '../../common/utils/pagination';

@Injectable()
export class PostingQueueService {
  constructor(private readonly repository: IntegrationsRepository) {}

  async enqueue(data: {
    tenantId: string;
    integrationId: string;
    docType: string;
    docId: string;
    payload: Record<string, unknown>;
  }): Promise<PostingQueueItem> {
    const idempotencyKey = `${data.docType}:${data.docId}`;
    return this.repository.enqueue({
      ...data,
      idempotencyKey,
    });
  }

  async getQueueItem(id: string): Promise<PostingQueueItem> {
    const item = await this.repository.findQueueItemById(id);
    if (!item) throw new NotFoundException('Queue item not found');
    return item;
  }

  async listQueue(tenantId: string, status?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repository.findQueueByTenant(tenantId, status, limit, offset),
      this.repository.countQueueByTenant(tenantId, status),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async getPendingItems(integrationId: string, limit = 50): Promise<PostingQueueItem[]> {
    return this.repository.findPendingItems(integrationId, limit);
  }

  async processItem(id: string): Promise<PostingQueueItem> {
    const item = await this.repository.markProcessing(id);
    if (!item) throw new NotFoundException('Queue item not found');
    return item;
  }

  async markSuccess(id: string, externalRef?: string): Promise<PostingQueueItem> {
    const item = await this.repository.markSuccess(id, externalRef);
    if (!item) throw new NotFoundException('Queue item not found');
    return item;
  }

  async markFailed(id: string, error: string): Promise<PostingQueueItem> {
    const item = await this.repository.markFailed(id, error);
    if (!item) throw new NotFoundException('Queue item not found');
    return item;
  }

  async retry(id: string): Promise<PostingQueueItem> {
    const item = await this.repository.retryItem(id);
    if (!item) throw new NotFoundException('Queue item not found');
    return item;
  }

  /**
   * Post a document to the finance system
   * This is a placeholder - actual implementation depends on integration type
   */
  async postDocument(
    integrationId: string,
    docType: string,
    docId: string,
    payload: Record<string, unknown>,
  ): Promise<{ success: boolean; externalRef?: string; error?: string }> {
    // Get the integration connection
    const connection = await this.repository.findConnectionById(integrationId);
    if (!connection) {
      return { success: false, error: 'Integration not found' };
    }

    if (connection.status !== 'CONNECTED') {
      return { success: false, error: 'Integration not connected' };
    }

    // Dispatch to appropriate handler based on type
    switch (connection.type) {
      case 'xero':
        return this.postToXero(connection as unknown as Record<string, unknown>, docType, payload);
      case 'sage':
        return this.postToSage(connection as unknown as Record<string, unknown>, docType, payload);
      default:
        return { success: false, error: `Unknown integration type: ${connection.type}` };
    }
  }

  private async postToXero(
    _connection: Record<string, unknown>,
    _docType: string,
    _payload: Record<string, unknown>,
  ): Promise<{ success: boolean; externalRef?: string; error?: string }> {
    // Placeholder for Xero API integration
    // In real implementation:
    // 1. Use Xero SDK to create invoice/credit note
    // 2. Return the Xero invoice ID as externalRef
    return { success: true, externalRef: 'XERO-PLACEHOLDER-ID' };
  }

  private async postToSage(
    _connection: Record<string, unknown>,
    _docType: string,
    _payload: Record<string, unknown>,
  ): Promise<{ success: boolean; externalRef?: string; error?: string }> {
    // Placeholder for Sage API integration
    return { success: true, externalRef: 'SAGE-PLACEHOLDER-ID' };
  }
}
