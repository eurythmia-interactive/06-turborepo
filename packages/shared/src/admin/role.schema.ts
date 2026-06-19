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

export const roleResponseSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  permissions: z.array(z.string()),
  userCount: z.number().optional(),
});

export type RoleResponse = z.infer<typeof roleResponseSchema>;
