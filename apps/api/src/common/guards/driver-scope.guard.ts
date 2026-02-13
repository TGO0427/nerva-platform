import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../db/database.module';
import { CurrentUserData } from '../decorators/current-user.decorator';

@Injectable()
export class DriverScopeGuard implements CanActivate {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserData;

    // Internal users bypass
    if (user.userType === 'internal') return true;

    // Driver users must have a linked driver record
    if (user.userType === 'driver') {
      const result = await this.pool.query(
        'SELECT id FROM drivers WHERE user_id = $1 AND is_active = true LIMIT 1',
        [user.id],
      );
      if (result.rows.length === 0) {
        throw new ForbiddenException('Driver account not linked');
      }
      request.driverId = result.rows[0].id;
      return true;
    }

    throw new ForbiddenException('Access denied');
  }
}
