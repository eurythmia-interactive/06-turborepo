import { z } from 'zod';

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  action: z.string().optional(),
  actionCategory: z.string().optional(),
  search: z.string().optional(),
  ip: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'action']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export const auditLogResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().nullable(),
  action: z.string(),
  details: z.record(z.string(), z.unknown()).nullable(),
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
  tenant: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    })
    .nullable()
    .optional(),
});

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;

export const auditLogDetailResponseSchema = auditLogResponseSchema.extend({
  timeAgo: z.string().optional(),
});

export type AuditLogDetailResponse = z.infer<typeof auditLogDetailResponseSchema>;

export const auditSummaryQuerySchema = z.object({
  timeRange: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
});

export type AuditSummaryQuery = z.infer<typeof auditSummaryQuerySchema>;

export const auditSummaryResponseSchema = z.object({
  total: z.number(),
  byAction: z.record(z.string(), z.number()),
  byCategory: z.record(z.string(), z.number()),
  byDay: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    }),
  ),
});

export type AuditSummaryResponse = z.infer<typeof auditSummaryResponseSchema>;

export const auditExportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  action: z.string().optional(),
  actionCategory: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(10000).default(1000),
});

export type AuditExportQuery = z.infer<typeof auditExportQuerySchema>;
