import { z } from 'zod';
import { AllPermissions } from './permissions.js';

export const createRoleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  description: z.string().max(200, 'Description must be 200 characters or less').optional(),
  permissions: z
    .array(z.string())
    .min(1, 'At least one permission is required')
    .refine(
      (perms) => perms.every((p) => AllPermissions.includes(p as never)),
      'Invalid permission',
    ),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = createRoleSchema.partial();

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const roleListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  includeSystem: z.coerce.boolean().default(false),
});

export type RoleListQuery = z.infer<typeof roleListQuerySchema>;

export const roleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: z.array(z.string()),
  isSystem: z.boolean(),
  userCount: z.number().optional(),
  createdAt: z.string().or(z.date()),
});

export type RoleResponse = z.infer<typeof roleResponseSchema>;

export const roleDetailResponseSchema = roleResponseSchema.extend({
  users: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string(),
      }),
    )
    .optional(),
});

export type RoleDetailResponse = z.infer<typeof roleDetailResponseSchema>;

export const assignPermissionsSchema = z.object({
  permissions: z
    .array(z.string())
    .min(1, 'At least one permission is required')
    .refine(
      (perms) => perms.every((p) => AllPermissions.includes(p as never)),
      'Invalid permission',
    ),
});

export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>;
