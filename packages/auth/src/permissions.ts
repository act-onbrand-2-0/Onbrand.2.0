/**
 * Brand role-based permissions and access control
 */

import type { BrandRole } from './types';

/**
 * Permission types for different actions
 */
export type Permission =
  // Content permissions
  | 'content:view'
  | 'content:create'
  | 'content:edit'
  | 'content:delete'
  | 'content:publish'
  | 'content:review'
  | 'content:approve'
  
  // Brand settings permissions
  | 'brand:view'
  | 'brand:edit'
  | 'brand:delete'
  
  // User management permissions
  | 'users:view'
  | 'users:invite'
  | 'users:edit'
  | 'users:remove'
  
  // Workflow permissions
  | 'workflows:view'
  | 'workflows:create'
  | 'workflows:edit'
  | 'workflows:delete'
  | 'workflows:execute'
  
  // Document permissions
  | 'documents:view'
  | 'documents:upload'
  | 'documents:edit'
  | 'documents:delete'
  
  // Analytics permissions
  | 'analytics:view'
  | 'analytics:export'
  
  // Email permissions
  | 'email:send'
  | 'email:view_logs'
  
  // AI permissions
  | 'ai:use'
  | 'ai:train_models';

/**
 * Role hierarchy (higher roles inherit permissions from lower roles)
 */
export const ROLE_HIERARCHY: Record<BrandRole, number> = {
  owner: 5,
  admin: 4,
  editor: 3,
  reviewer: 2,
  user: 1,
};

/**
 * Permissions for each role
 */
export const ROLE_PERMISSIONS: Record<BrandRole, Permission[]> = {
  // Owner: Full access to everything
  owner: [
    'content:view',
    'content:create',
    'content:edit',
    'content:delete',
    'content:publish',
    'content:review',
    'content:approve',
    'brand:view',
    'brand:edit',
    'brand:delete',
    'users:view',
    'users:invite',
    'users:edit',
    'users:remove',
    'workflows:view',
    'workflows:create',
    'workflows:edit',
    'workflows:delete',
    'workflows:execute',
    'documents:view',
    'documents:upload',
    'documents:edit',
    'documents:delete',
    'analytics:view',
    'analytics:export',
    'email:send',
    'email:view_logs',
    'ai:use',
    'ai:train_models',
  ],
  
  // Admin: Can manage users and most content, but not delete brand
  admin: [
    'content:view',
    'content:create',
    'content:edit',
    'content:delete',
    'content:publish',
    'content:review',
    'content:approve',
    'brand:view',
    'brand:edit',
    'users:view',
    'users:invite',
    'users:edit',
    'users:remove',
    'workflows:view',
    'workflows:create',
    'workflows:edit',
    'workflows:delete',
    'workflows:execute',
    'documents:view',
    'documents:upload',
    'documents:edit',
    'documents:delete',
    'analytics:view',
    'analytics:export',
    'email:send',
    'email:view_logs',
    'ai:use',
    'ai:train_models',
  ],
  
  // Editor: Can create and edit content, manage documents
  editor: [
    'content:view',
    'content:create',
    'content:edit',
    'content:publish',
    'brand:view',
    'users:view',
    'workflows:view',
    'workflows:execute',
    'documents:view',
    'documents:upload',
    'documents:edit',
    'analytics:view',
    'email:send',
    'ai:use',
  ],
  
  // Reviewer: Can view and review content, but not publish
  reviewer: [
    'content:view',
    'content:review',
    'content:approve',
    'brand:view',
    'users:view',
    'workflows:view',
    'documents:view',
    'analytics:view',
  ],
  
  // User: Basic read-only access
  user: [
    'content:view',
    'brand:view',
    'documents:view',
    'analytics:view',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: BrandRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: BrandRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: BrandRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Check if a role is at least a certain level
 */
export function isRoleAtLeast(role: BrandRole, minimumRole: BrandRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Check if a role is higher than another role
 */
export function isRoleHigherThan(role: BrandRole, otherRole: BrandRole): boolean {
  return ROLE_HIERARCHY[role] > ROLE_HIERARCHY[otherRole];
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: BrandRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: BrandRole): string {
  const names: Record<BrandRole, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    editor: 'Editor',
    reviewer: 'Reviewer',
    user: 'User',
  };
  return names[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: BrandRole): string {
  const descriptions: Record<BrandRole, string> = {
    owner: 'Full access to all brand features including user management and brand deletion',
    admin: 'Can manage users, content, and brand settings but cannot delete the brand',
    editor: 'Can create, edit, and publish content and manage documents',
    reviewer: 'Can view and review content but cannot publish or edit',
    user: 'Basic read-only access to brand content and analytics',
  };
  return descriptions[role];
}

/**
 * Permission guard for use in components/routes
 */
export function requirePermission(
  userRole: BrandRole | undefined,
  requiredPermission: Permission
): boolean {
  if (!userRole) return false;
  return hasPermission(userRole, requiredPermission);
}

/**
 * Permission guard for multiple permissions (requires all)
 */
export function requireAllPermissions(
  userRole: BrandRole | undefined,
  requiredPermissions: Permission[]
): boolean {
  if (!userRole) return false;
  return hasAllPermissions(userRole, requiredPermissions);
}

/**
 * Permission guard for multiple permissions (requires any)
 */
export function requireAnyPermission(
  userRole: BrandRole | undefined,
  requiredPermissions: Permission[]
): boolean {
  if (!userRole) return false;
  return hasAnyPermission(userRole, requiredPermissions);
}

/**
 * Check if user can manage another user (must have higher role)
 */
export function canManageUser(
  managerRole: BrandRole,
  targetUserRole: BrandRole
): boolean {
  return isRoleHigherThan(managerRole, targetUserRole);
}
