export const HEALTH_CHECK = 'ok' as const;

export type HealthStatus = typeof HEALTH_CHECK;

export interface ApiResponse<T> {
  data: T;
  status: HealthStatus;
  timestamp: string;
}

export const createResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  status: HEALTH_CHECK,
  timestamp: new Date().toISOString(),
});

export {
  loginSchema,
  loginResponseSchema,
  type LoginInput,
  type LoginResponse,
} from './auth/login.schema.js';
export {
  profileUpdateSchema,
  profileResponseSchema,
  type ProfileUpdateInput,
  type ProfileResponse,
} from './auth/profile.schema.js';
export {
  registerSchema,
  registerResponseSchema,
  type RegisterInput,
  type RegisterResponse,
} from './auth/register.schema.js';

export {
  Permissions,
  AllPermissions,
  RolePermissions,
  type Permission,
} from './admin/permissions.js';

export {
  createTenantSchema,
  updateTenantSchema,
  tenantResponseSchema,
  type CreateTenantInput,
  type UpdateTenantInput,
  type TenantResponse,
} from './admin/tenant.schema.js';

export {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  userResponseSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserListQuery,
  type UserResponse,
} from './admin/user.schema.js';

export {
  createRoleSchema,
  updateRoleSchema,
  roleResponseSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
  type RoleResponse,
} from './admin/role.schema.js';

export {
  featureFlagSchema,
  systemConfigSchema,
  maintenanceSchema,
  type FeatureFlagInput,
  type SystemConfigInput,
  type MaintenanceInput,
} from './admin/system.schema.js';

export {
  auditLogQuerySchema,
  auditLogResponseSchema,
  type AuditLogQuery,
  type AuditLogResponse,
} from './admin/audit.schema.js';

export { adminPasswordSchema, type AdminPasswordInput } from './admin/password.schema.js';
