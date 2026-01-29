import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface AuditEntry {
  id: string;
  tenantId: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface CreateAuditEntry {
  tenantId: string;
  actorUserId?: string;
  entityType: string;
  entityId?: string;
  action: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditRepository extends BaseRepository {
  async create(data: CreateAuditEntry): Promise<AuditEntry> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO audit_log (
        tenant_id, actor_user_id, entity_type, entity_id, action,
        before_json, after_json, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.tenantId,
        data.actorUserId || null,
        data.entityType,
        data.entityId || null,
        data.action,
        data.before ? JSON.stringify(data.before) : null,
        data.after ? JSON.stringify(data.after) : null,
        data.ipAddress || null,
        data.userAgent || null,
      ],
    );
    return this.mapAuditEntry(row!);
  }

  async findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    limit = 50,
    offset = 0,
  ): Promise<AuditEntry[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT * FROM audit_log
       WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
       ORDER BY created_at DESC
       LIMIT $4 OFFSET $5`,
      [tenantId, entityType, entityId, limit, offset],
    );
    return rows.map(this.mapAuditEntry);
  }

  async findByTenant(
    tenantId: string,
    filters: {
      entityType?: string;
      action?: string;
      actorUserId?: string;
      fromDate?: Date;
      toDate?: Date;
    },
    limit = 50,
    offset = 0,
  ): Promise<AuditEntry[]> {
    const conditions = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let idx = 2;

    if (filters.entityType) {
      conditions.push(`entity_type = $${idx++}`);
      values.push(filters.entityType);
    }
    if (filters.action) {
      conditions.push(`action = $${idx++}`);
      values.push(filters.action);
    }
    if (filters.actorUserId) {
      conditions.push(`actor_user_id = $${idx++}`);
      values.push(filters.actorUserId);
    }
    if (filters.fromDate) {
      conditions.push(`created_at >= $${idx++}`);
      values.push(filters.fromDate);
    }
    if (filters.toDate) {
      conditions.push(`created_at <= $${idx++}`);
      values.push(filters.toDate);
    }

    values.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT * FROM audit_log
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      values,
    );
    return rows.map(this.mapAuditEntry);
  }

  private mapAuditEntry(row: Record<string, unknown>): AuditEntry {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      actorUserId: row.actor_user_id as string | null,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string | null,
      action: row.action as string,
      beforeJson: row.before_json as Record<string, unknown> | null,
      afterJson: row.after_json as Record<string, unknown> | null,
      ipAddress: row.ip_address as string | null,
      userAgent: row.user_agent as string | null,
      createdAt: row.created_at as Date,
    };
  }
}
