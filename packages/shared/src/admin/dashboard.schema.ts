import { z } from 'zod';

export const timeRangeSchema = z.enum(['today', 'week', 'month', 'quarter', 'year', 'all']);
export type TimeRange = z.infer<typeof timeRangeSchema>;

export const periodSchema = z.enum(['day', 'week', 'month']);
export type Period = z.infer<typeof periodSchema>;

export const dashboardMetricsQuerySchema = z.object({
  timeRange: timeRangeSchema.default('month'),
});
export type DashboardMetricsQuery = z.infer<typeof dashboardMetricsQuerySchema>;

export const dashboardMetricsResponseSchema = z.object({
  users: z.object({
    total: z.number(),
    active: z.number(),
    newToday: z.number(),
    newThisWeek: z.number(),
    growth: z.number(),
    byStatus: z.object({
      ACTIVE: z.number(),
      SUSPENDED: z.number(),
      PENDING: z.number(),
    }),
    byRole: z.object({
      SUPER_ADMIN: z.number(),
      ADMIN: z.number(),
      MEMBER: z.number(),
      GUEST: z.number(),
    }),
  }),
  tenants: z.object({
    total: z.number(),
    active: z.number(),
    newToday: z.number(),
    newThisWeek: z.number(),
    suspended: z.number(),
    avgUsersPerTenant: z.number(),
  }),
  activity: z.object({
    totalSessionsToday: z.number(),
    activeTenantsToday: z.number(),
    peakHour: z.number(),
    trend: z.number(),
  }),
  period: z.object({
    start: z.string(),
    end: z.string(),
    label: z.string(),
  }),
});
export type DashboardMetricsResponse = z.infer<typeof dashboardMetricsResponseSchema>;

export const growthQuerySchema = z.object({
  metric: z.enum(['users', 'tenants']),
  period: periodSchema.default('day'),
  limit: z.coerce.number().int().positive().max(365).default(30),
});
export type GrowthQuery = z.infer<typeof growthQuerySchema>;

export const growthDataPointSchema = z.object({
  date: z.string(),
  new: z.number(),
  cumulative: z.number(),
  growthRate: z.number().nullable().optional(),
});

export const growthResponseSchema = z.object({
  metric: z.string(),
  period: z.string(),
  data: z.array(growthDataPointSchema),
  summary: z.object({
    total: z.number(),
    average: z.number(),
    peak: z.object({
      date: z.string(),
      value: z.number(),
    }),
    growth: z.number(),
  }),
});
export type GrowthResponse = z.infer<typeof growthResponseSchema>;

export const activityQuerySchema = z.object({
  type: z.enum(['sessions', 'users']),
  period: periodSchema.default('day'),
  limit: z.coerce.number().int().positive().max(365).optional(),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;

export const activityDataPointSchema = z.object({
  timestamp: z.string(),
  value: z.number(),
  label: z.string(),
});

export const activityResponseSchema = z.object({
  type: z.string(),
  period: z.string(),
  data: z.array(activityDataPointSchema),
  summary: z.object({
    total: z.number(),
    average: z.number(),
    peak: z.object({
      timestamp: z.string(),
      value: z.number(),
    }),
  }),
});
export type ActivityResponse = z.infer<typeof activityResponseSchema>;

export const recentActivityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.string().optional(),
});
export type RecentActivityQuery = z.infer<typeof recentActivityQuerySchema>;

export const recentActivityEventSchema = z.object({
  id: z.string(),
  action: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
  tenant: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    })
    .nullable()
    .optional(),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
  ip: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  timestamp: z.string(),
  timeAgo: z.string(),
});

export const recentActivityResponseSchema = z.object({
  events: z.array(recentActivityEventSchema),
  total: z.number(),
  hasMore: z.boolean(),
});
export type RecentActivityResponse = z.infer<typeof recentActivityResponseSchema>;
