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

export interface AuditEntryWithActor extends AuditEntry {
  actorName: string | null;
}

export interface AuditSearchFilters {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorUserId?: string;
  fromDate?: Date;
  toDate?: Date;
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
    filters: AuditSearchFilters,
    limit = 50,
    offset = 0,
  ): Promise<AuditEntry[]> {
    const { conditions, values, idx } = this.buildFilterConditions(tenantId, filters);
    values.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT * FROM audit_log
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values,
    );
    return rows.map(this.mapAuditEntry);
  }

  async findByTenantWithActor(
    tenantId: string,
    filters: AuditSearchFilters,
    limit = 50,
    offset = 0,
  ): Promise<AuditEntryWithActor[]> {
    const { conditions, values, idx } = this.buildFilterConditions(tenantId, filters, 'a');
    values.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT a.*, u.display_name AS actor_name
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values,
    );
    return rows.map((row) => ({
      ...this.mapAuditEntry(row),
      actorName: (row.actor_name as string) || null,
    }));
  }

  async countByTenant(
    tenantId: string,
    filters: AuditSearchFilters,
  ): Promise<number> {
    const { conditions, values } = this.buildFilterConditions(tenantId, filters);

    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT COUNT(*)::int AS total FROM audit_log
       WHERE ${conditions.join(' AND ')}`,
      values,
    );
    return (row?.total as number) || 0;
  }

  private buildFilterConditions(
    tenantId: string,
    filters: AuditSearchFilters,
    alias?: string,
  ): { conditions: string[]; values: unknown[]; idx: number } {
    const col = (name: string) => alias ? `${alias}.${name}` : name;
    const conditions = [`${col('tenant_id')} = $1`];
    const values: unknown[] = [tenantId];
    let idx = 2;

    if (filters.entityType) {
      conditions.push(`${col('entity_type')} = $${idx++}`);
      values.push(filters.entityType);
    }
    if (filters.entityId) {
      conditions.push(`${col('entity_id')} = $${idx++}`);
      values.push(filters.entityId);
    }
    if (filters.action) {
      conditions.push(`${col('action')} = $${idx++}`);
      values.push(filters.action);
    }
    if (filters.actorUserId) {
      conditions.push(`${col('actor_user_id')} = $${idx++}`);
      values.push(filters.actorUserId);
    }
    if (filters.fromDate) {
      conditions.push(`${col('created_at')} >= $${idx++}`);
      values.push(filters.fromDate);
    }
    if (filters.toDate) {
      conditions.push(`${col('created_at')} <= $${idx++}`);
      values.push(filters.toDate);
    }

    return { conditions, values, idx };
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
