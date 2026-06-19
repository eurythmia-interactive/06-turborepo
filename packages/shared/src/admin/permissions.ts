export const Permissions = {
  TENANT_READ: 'tenant:read',
  TENANT_WRITE: 'tenant:write',
  TENANT_DELETE: 'tenant:delete',
  TENANT_SUSPEND: 'tenant:suspend',

  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  USER_SUSPEND: 'user:suspend',
  USER_RESET_PASSWORD: 'user:reset-password',
  USER_IMPERSONATE: 'user:impersonate',

  ROLE_READ: 'role:read',
  ROLE_WRITE: 'role:write',
  ROLE_DELETE: 'role:delete',

  ADMIN_ACCESS: 'admin:access',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_FEATURE_FLAGS: 'admin:feature-flags',
  ADMIN_AUDIT: 'admin:audit',
  ADMIN_API_KEYS: 'admin:api-keys',

  SYSTEM_MAINTENANCE: 'system:maintenance',
  SYSTEM_BACKUP: 'system:backup',
  SYSTEM_CONFIG: 'system:config',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const AllPermissions: Permission[] = Object.values(Permissions);

export const RolePermissions: Record<string, Permission[]> = {
  SUPER_ADMIN: AllPermissions,
  ADMIN: [
    Permissions.TENANT_READ,
    Permissions.TENANT_WRITE,
    Permissions.TENANT_DELETE,
    Permissions.TENANT_SUSPEND,
    Permissions.USER_READ,
    Permissions.USER_WRITE,
    Permissions.USER_DELETE,
    Permissions.USER_SUSPEND,
    Permissions.USER_RESET_PASSWORD,
    Permissions.ROLE_READ,
    Permissions.ROLE_WRITE,
    Permissions.ROLE_DELETE,
    Permissions.ADMIN_ACCESS,
    Permissions.ADMIN_AUDIT,
  ],
  MEMBER: [Permissions.USER_READ, Permissions.TENANT_READ],
  GUEST: [Permissions.USER_READ],
};
