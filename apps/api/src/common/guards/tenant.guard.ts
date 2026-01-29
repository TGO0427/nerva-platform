import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Get tenant from JWT claims (set by auth)
    const user = request.user;
    if (user?.tenantId) {
      request.tenantId = user.tenantId;
    }

    // Allow header override for admin operations
    const headerTenantId = request.headers['x-tenant-id'];
    const headerSiteId = request.headers['x-site-id'];

    if (headerTenantId) {
      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(headerTenantId)) {
        throw new BadRequestException('Invalid tenant ID format');
      }
      request.tenantId = headerTenantId;
    }

    if (headerSiteId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(headerSiteId)) {
        throw new BadRequestException('Invalid site ID format');
      }
      request.siteId = headerSiteId;
    }

    if (!request.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    return true;
  }
}
