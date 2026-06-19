import { z } from 'zod';

export const PLAN_VALUES = ['free', 'pro', 'enterprise'] as const;
export type Plan = (typeof PLAN_VALUES)[number];

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be 50 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  adminEmail: z.string().email('Invalid email address').optional(),
  plan: z.enum(PLAN_VALUES).default('free'),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = createTenantSchema.partial();

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export const tenantListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'suspended', 'deleted']).default('active'),
  sortBy: z.enum(['name', 'createdAt', 'userCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type TenantListQuery = z.infer<typeof tenantListQuerySchema>;

export const tenantResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  plan: z.string(),
  domain: z.string().nullable().optional(),
  suspended: z.boolean(),
  isSystem: z.boolean(),
  deletedAt: z.date().nullable().optional(),
  deletedBy: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  users: z
    .array(
      z.object({
        userId: z.string(),
        createdAt: z.date(),
      }),
    )
    .optional(),
  _count: z
    .object({
      users: z.number(),
    })
    .optional(),
});

export type TenantResponse = z.infer<typeof tenantResponseSchema>;

export const suspendTenantSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be 500 characters or less'),
});

export type SuspendTenantInput = z.infer<typeof suspendTenantSchema>;

export const tenantStatsResponseSchema = z.object({
  totalUsers: z.number(),
  activeUsers: z.number(),
  suspendedUsers: z.number(),
  pendingUsers: z.number(),
  usersByRole: z.object({
    SUPER_ADMIN: z.number(),
    ADMIN: z.number(),
    MEMBER: z.number(),
    GUEST: z.number(),
  }),
  auditLogCount30Days: z.number(),
});

export type TenantStatsResponse = z.infer<typeof tenantStatsResponseSchema>;
