import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be 50 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  adminEmail: z.string().email('Invalid email address'),
  plan: z.string().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = createTenantSchema.partial();

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export const tenantResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
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
