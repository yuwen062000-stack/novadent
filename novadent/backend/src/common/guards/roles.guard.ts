// RBAC Roles Guard
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 沒有 @Roles() 標記 → 登入即可
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('未登入');

    // SUPER_ADMIN 可以存取所有 API
    if (user.role === 'SUPER_ADMIN') return true;

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) throw new ForbiddenException(`此功能需要角色：${requiredRoles.join(' / ')}`);
    return true;
  }
}
