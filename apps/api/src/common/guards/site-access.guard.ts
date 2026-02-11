import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Pool } from 'pg';

export const SKIP_SITE_ACCESS_CHECK = 'skipSiteAccessCheck';

/**
 * Guard that validates user has access to the requested site.
 * Used for write operations to ensure users can only modify data
 * in sites they are assigned to.
 *
 * Skip this check by using @SkipSiteAccessCheck() decorator.
 */
@Injectable()
export class SiteAccessGuard implements CanActivate {
  constructor(
    @Inject('DATABASE_POOL') private readonly pool: Pool,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this route should skip site access check
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_SITE_ACCESS_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const siteId = request.siteId;

    // If no siteId specified, allow (will use tenant-level filtering)
    if (!siteId) {
      return true;
    }

    // If no user, let auth guard handle it
    if (!userId) {
      return true;
    }

    // Check if user has access to this site
    const hasAccess = await this.checkUserSiteAccess(userId, siteId);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this site');
    }

    return true;
  }

  private async checkUserSiteAccess(userId: string, siteId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM user_sites WHERE user_id = $1 AND site_id = $2',
      [userId, siteId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
