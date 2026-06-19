import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or less')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  tenantId: z.string().min(1, 'Tenant is required'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']).default('MEMBER'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  tenantId: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING', 'ALL']).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLoginAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']),
  isSystem: z.boolean(),
  lastLoginAt: z.date().nullable().optional(),
  deletedAt: z.date().nullable().optional(),
  deletedBy: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tenants: z
    .array(
      z.object({
        tenantId: z.string(),
        role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']),
        createdAt: z.date(),
      }),
    )
    .optional(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

export const suspendUserSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be 500 characters or less'),
});

export type SuspendUserInput = z.infer<typeof suspendUserSchema>;

export const addToTenantSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']).default('MEMBER'),
});

export type AddToTenantInput = z.infer<typeof addToTenantSchema>;

export const updateTenantRoleSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']),
});

export type UpdateTenantRoleInput = z.infer<typeof updateTenantRoleSchema>;

export const bulkUserActionSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user is required'),
  reason: z.string().optional(),
});

export type BulkUserActionInput = z.infer<typeof bulkUserActionSchema>;

export const bulkRoleAssignSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user is required'),
  tenantId: z.string().min(1, 'Tenant is required'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']),
});

export type BulkRoleAssignInput = z.infer<typeof bulkRoleAssignSchema>;
