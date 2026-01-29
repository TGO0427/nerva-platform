import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface IntegrationConnection {
  id: string;
  tenantId: string;
  type: string;
  name: string;
  status: string;
  configJson: Record<string, unknown>;
  lastSyncAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostingQueueItem {
  id: string;
  tenantId: string;
  integrationId: string;
  docType: string;
  docId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  externalRef: string | null;
  nextRetryAt: Date | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class IntegrationsRepository extends BaseRepository {
  // Connections
  async createConnection(data: {
    tenantId: string;
    type: string;
    name: string;
    configJson?: Record<string, unknown>;
  }): Promise<IntegrationConnection> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO integration_connections (tenant_id, type, name, config_json)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.tenantId, data.type, data.name, JSON.stringify(data.configJson || {})],
    );
    return this.mapConnection(row!);
  }

  async findConnectionById(id: string): Promise<IntegrationConnection | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM integration_connections WHERE id = $1',
      [id],
    );
    return row ? this.mapConnection(row) : null;
  }

  async findConnectionsByTenant(tenantId: string): Promise<IntegrationConnection[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      'SELECT * FROM integration_connections WHERE tenant_id = $1 ORDER BY name',
      [tenantId],
    );
    return rows.map(this.mapConnection);
  }

  async updateConnectionStatus(
    id: string,
    status: string,
    errorMessage?: string,
  ): Promise<IntegrationConnection | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE integration_connections SET status = $1, error_message = $2, last_sync_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, errorMessage || null, id],
    );
    return row ? this.mapConnection(row) : null;
  }

  async updateConnectionConfig(
    id: string,
    configJson: Record<string, unknown>,
  ): Promise<IntegrationConnection | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE integration_connections SET config_json = $1 WHERE id = $2 RETURNING *`,
      [JSON.stringify(configJson), id],
    );
    return row ? this.mapConnection(row) : null;
  }

  // Posting Queue
  async enqueue(data: {
    tenantId: string;
    integrationId: string;
    docType: string;
    docId: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
  }): Promise<PostingQueueItem> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO posting_queue (tenant_id, integration_id, doc_type, doc_id, idempotency_key, payload)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, integration_id, idempotency_key) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [
        data.tenantId,
        data.integrationId,
        data.docType,
        data.docId,
        data.idempotencyKey,
        JSON.stringify(data.payload),
      ],
    );
    return this.mapQueueItem(row!);
  }

  async findQueueItemById(id: string): Promise<PostingQueueItem | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM posting_queue WHERE id = $1',
      [id],
    );
    return row ? this.mapQueueItem(row) : null;
  }

  async findPendingItems(integrationId: string, limit = 50): Promise<PostingQueueItem[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT * FROM posting_queue
       WHERE integration_id = $1 AND status IN ('PENDING', 'RETRYING')
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
       ORDER BY created_at ASC LIMIT $2`,
      [integrationId, limit],
    );
    return rows.map(this.mapQueueItem);
  }

  async findQueueByTenant(
    tenantId: string,
    status?: string,
    limit = 50,
    offset = 0,
  ): Promise<PostingQueueItem[]> {
    let sql = 'SELECT * FROM posting_queue WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapQueueItem);
  }

  async markProcessing(id: string): Promise<PostingQueueItem | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE posting_queue SET status = 'PROCESSING', attempts = attempts + 1
       WHERE id = $1 RETURNING *`,
      [id],
    );
    return row ? this.mapQueueItem(row) : null;
  }

  async markSuccess(id: string, externalRef?: string): Promise<PostingQueueItem | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE posting_queue SET status = 'SUCCESS', external_ref = $1, processed_at = NOW()
       WHERE id = $2 RETURNING *`,
      [externalRef || null, id],
    );
    return row ? this.mapQueueItem(row) : null;
  }

  async markFailed(id: string, error: string): Promise<PostingQueueItem | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE posting_queue SET
         status = CASE WHEN attempts >= max_attempts THEN 'FAILED' ELSE 'RETRYING' END,
         last_error = $1,
         next_retry_at = NOW() + INTERVAL '5 minutes' * attempts
       WHERE id = $2 RETURNING *`,
      [error, id],
    );
    return row ? this.mapQueueItem(row) : null;
  }

  async retryItem(id: string): Promise<PostingQueueItem | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE posting_queue SET status = 'PENDING', next_retry_at = NULL
       WHERE id = $1 RETURNING *`,
      [id],
    );
    return row ? this.mapQueueItem(row) : null;
  }

  private mapConnection(row: Record<string, unknown>): IntegrationConnection {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      type: row.type as string,
      name: row.name as string,
      status: row.status as string,
      configJson: (row.config_json as Record<string, unknown>) || {},
      lastSyncAt: row.last_sync_at as Date | null,
      errorMessage: row.error_message as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapQueueItem(row: Record<string, unknown>): PostingQueueItem {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      integrationId: row.integration_id as string,
      docType: row.doc_type as string,
      docId: row.doc_id as string,
      idempotencyKey: row.idempotency_key as string,
      payload: (row.payload as Record<string, unknown>) || {},
      status: row.status as string,
      attempts: row.attempts as number,
      maxAttempts: row.max_attempts as number,
      lastError: row.last_error as string | null,
      externalRef: row.external_ref as string | null,
      nextRetryAt: row.next_retry_at as Date | null,
      processedAt: row.processed_at as Date | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
