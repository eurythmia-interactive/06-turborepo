import { z } from 'zod';

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export const auditLogResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().nullable(),
  action: z.string(),
  details: z.any().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
  user: z
    .object({
      id: z.string(),
      email: z.string(),
      name: z.string().nullable(),
    })
    .optional(),
});

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;
