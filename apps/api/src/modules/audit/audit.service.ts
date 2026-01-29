import { Injectable } from '@nestjs/common';
import { AuditRepository, AuditEntry, CreateAuditEntry } from './audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(data: CreateAuditEntry): Promise<AuditEntry> {
    return this.auditRepository.create(data);
  }

  async logCreate(
    tenantId: string,
    entityType: string,
    entityId: string,
    after: Record<string, unknown>,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditEntry> {
    return this.log({
      tenantId,
      entityType,
      entityId,
      action: 'CREATE',
      after,
      actorUserId,
      ipAddress,
      userAgent,
    });
  }

  async logUpdate(
    tenantId: string,
    entityType: string,
    entityId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditEntry> {
    return this.log({
      tenantId,
      entityType,
      entityId,
      action: 'UPDATE',
      before,
      after,
      actorUserId,
      ipAddress,
      userAgent,
    });
  }

  async logDelete(
    tenantId: string,
    entityType: string,
    entityId: string,
    before: Record<string, unknown>,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditEntry> {
    return this.log({
      tenantId,
      entityType,
      entityId,
      action: 'DELETE',
      before,
      actorUserId,
      ipAddress,
      userAgent,
    });
  }

  async logApprove(
    tenantId: string,
    entityType: string,
    entityId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditEntry> {
    return this.log({
      tenantId,
      entityType,
      entityId,
      action: 'APPROVE',
      before,
      after,
      actorUserId,
      ipAddress,
      userAgent,
    });
  }

  async getEntityHistory(
    tenantId: string,
    entityType: string,
    entityId: string,
    limit = 50,
    offset = 0,
  ): Promise<AuditEntry[]> {
    return this.auditRepository.findByEntity(
      tenantId,
      entityType,
      entityId,
      limit,
      offset,
    );
  }

  async search(
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
    return this.auditRepository.findByTenant(tenantId, filters, limit, offset);
  }
}
