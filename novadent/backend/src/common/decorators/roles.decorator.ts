// @Roles() Decorator — 標記 API 需要的角色
import { SetMetadata } from '@nestjs/common';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CLINIC' | 'LAB' | 'MEMBER' | 'INSURER';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
