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
  tenantListQuerySchema,
  tenantResponseSchema,
  suspendTenantSchema,
  tenantStatsResponseSchema,
  type CreateTenantInput,
  type UpdateTenantInput,
  type TenantListQuery,
  type TenantResponse,
  type SuspendTenantInput,
  type TenantStatsResponse,
} from './admin/tenant.schema.js';
export { PLAN_VALUES, type Plan } from './admin/tenant.schema.js';

export {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  userResponseSchema,
  suspendUserSchema,
  addToTenantSchema,
  updateTenantRoleSchema,
  bulkUserActionSchema,
  bulkRoleAssignSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserListQuery,
  type UserResponse,
  type SuspendUserInput,
  type AddToTenantInput,
  type UpdateTenantRoleInput,
  type BulkUserActionInput,
  type BulkRoleAssignInput,
} from './admin/user.schema.js';

export {
  createRoleSchema,
  updateRoleSchema,
  roleListQuerySchema,
  roleResponseSchema,
  roleDetailResponseSchema,
  assignPermissionsSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
  type RoleListQuery,
  type RoleResponse,
  type RoleDetailResponse,
  type AssignPermissionsInput,
} from './admin/role.schema.js';

export {
  featureFlagSchema,
  systemConfigSchema,
  maintenanceSchema,
  enableMaintenanceSchema,
  type FeatureFlagInput,
  type SystemConfigInput,
  type MaintenanceInput,
  type EnableMaintenanceInput,
} from './admin/system.schema.js';

export {
  auditLogQuerySchema,
  auditLogResponseSchema,
  auditLogDetailResponseSchema,
  auditSummaryQuerySchema,
  auditSummaryResponseSchema,
  auditExportQuerySchema,
  type AuditLogQuery,
  type AuditLogResponse,
  type AuditLogDetailResponse,
  type AuditSummaryQuery,
  type AuditSummaryResponse,
  type AuditExportQuery,
} from './admin/audit.schema.js';

export {
  sessionStatusSchema,
  sessionListQuerySchema,
  deviceInfoSchema,
  sessionResponseSchema,
  sessionListResponseSchema,
  revokeSessionResponseSchema,
  revokeAllSessionsResponseSchema,
  type SessionStatus,
  type SessionListQuery,
  type DeviceInfo,
  type SessionResponse,
  type SessionListResponse,
  type RevokeSessionResponse,
  type RevokeAllSessionsResponse,
} from './admin/session.schema.js';

export { adminPasswordSchema, type AdminPasswordInput } from './admin/password.schema.js';

export {
  timeRangeSchema,
  periodSchema,
  dashboardMetricsQuerySchema,
  dashboardMetricsResponseSchema,
  growthQuerySchema,
  growthDataPointSchema,
  growthResponseSchema,
  activityQuerySchema,
  activityDataPointSchema,
  activityResponseSchema,
  recentActivityQuerySchema,
  recentActivityEventSchema,
  recentActivityResponseSchema,
  type TimeRange,
  type Period,
  type DashboardMetricsQuery,
  type DashboardMetricsResponse,
  type GrowthQuery,
  type GrowthResponse,
  type ActivityQuery,
  type ActivityResponse,
  type RecentActivityQuery,
  type RecentActivityResponse,
} from './admin/dashboard.schema.js';

export {
  createInvitationSchema,
  invitationResponseSchema,
  invitationListQuerySchema,
  type CreateInvitationInput,
  type InvitationResponse,
  type InvitationListQuery,
} from './admin/invitation.schema.js';
