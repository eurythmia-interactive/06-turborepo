import { z } from 'zod';

export const featureFlagSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(50, 'Key must be 50 characters or less')
    .regex(/^[a-z0-9_]+$/, 'Key must be lowercase with underscores only'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  enabled: z.boolean().default(false),
  tenantId: z.string().optional(),
});

export type FeatureFlagInput = z.infer<typeof featureFlagSchema>;

export const systemConfigSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(50, 'Key must be 50 characters or less')
    .regex(/^[a-z0-9_]+$/, 'Key must be lowercase with underscores only'),
  value: z.any(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

export type SystemConfigInput = z.infer<typeof systemConfigSchema>;

export const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(500, 'Message must be 500 characters or less').optional(),
  scheduledEnd: z.string().datetime().optional(),
});

export type MaintenanceInput = z.infer<typeof maintenanceSchema>;

export const enableMaintenanceSchema = z.object({
  message: z.string().max(500, 'Message must be 500 characters or less').optional(),
  scheduledEnd: z.string().datetime().optional(),
});

export type EnableMaintenanceInput = z.infer<typeof enableMaintenanceSchema>;
