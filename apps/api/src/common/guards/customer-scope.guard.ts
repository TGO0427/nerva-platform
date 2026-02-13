import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { CurrentUserData } from '../decorators/current-user.decorator';

@Injectable()
export class CustomerScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserData;

    // Internal users bypass
    if (user.userType === 'internal') return true;

    // Customer users must have a customerId
    if (user.userType === 'customer') {
      if (!user.customerId) {
        throw new ForbiddenException('Customer account not linked');
      }
      request.customerId = user.customerId;
      return true;
    }

    throw new ForbiddenException('Access denied');
  }
}
