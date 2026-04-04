// C-09 RoleGuard — 路由角色守衛
// 使用於：所有需要授權的頁面/功能區塊
import React from 'react';
import { UserRole } from '../../types';

interface RoleGuardProps {
  /** 允許存取的角色清單 */
  allowedRoles: UserRole[];
  /** 目前登入的角色 */
  role: UserRole;
  children: React.ReactNode;
  /** 無權限時顯示的內容，預設 null */
  fallback?: React.ReactNode;
}

/**
 * 元件包裝版：僅當 role 在 allowedRoles 內才渲染 children
 * @example
 * <RoleGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']} role={currentRole}>
 *   <AdminPanel />
 * </RoleGuard>
 */
export function RoleGuard({ allowedRoles, role, children, fallback = null }: RoleGuardProps) {
  if (!allowedRoles.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}

/**
 * hook 版本：回傳 boolean，方便在 JSX 條件判斷
 * @example
 * const canEdit = useRoleGuard(role, ['ADMIN', 'SUPER_ADMIN']);
 */
export function useRoleGuard(role: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(role);
}
