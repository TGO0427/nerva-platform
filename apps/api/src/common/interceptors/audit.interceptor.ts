import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../../modules/audit/audit.service';

export const AUDIT_ACTION_KEY = 'audit_action';

export interface AuditMetadata {
  entityType: string;
  action: string;
}

export const AuditAction = (metadata: AuditMetadata) =>
  Reflect.metadata(AUDIT_ACTION_KEY, metadata);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMetadata = this.reflector.get<AuditMetadata>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const beforeState = request.body;

    return next.handle().pipe(
      tap((response) => {
        this.auditService.log({
          tenantId: request.tenantId,
          actorUserId: request.user?.id,
          entityType: auditMetadata.entityType,
          entityId: response?.id,
          action: auditMetadata.action,
          before: beforeState,
          after: response,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        }).catch((err) => console.error('Audit log failed:', err));
      }),
    );
  }
}
