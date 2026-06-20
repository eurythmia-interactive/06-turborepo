import { z } from 'zod';

export const sessionStatusSchema = z.enum(['active', 'expired', 'revoked']);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const sessionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  userId: z.string().optional(),
  status: sessionStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'expiresAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type SessionListQuery = z.infer<typeof sessionListQuerySchema>;

export const deviceInfoSchema = z.object({
  type: z.enum(['desktop', 'mobile', 'tablet', 'unknown']),
  browser: z.string(),
  os: z.string(),
});

export type DeviceInfo = z.infer<typeof deviceInfoSchema>;

export const sessionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable().optional(),
  }),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  device: deviceInfoSchema.optional(),
  familyId: z.string(),
  revoked: z.boolean(),
  createdAt: z.string(),
  expiresAt: z.string(),
  status: sessionStatusSchema,
  isCurrent: z.boolean().optional(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const sessionListResponseSchema = z.object({
  data: z.array(sessionResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
  summary: z.object({
    totalActive: z.number(),
    totalExpired: z.number(),
    totalRevoked: z.number(),
  }),
});

export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;

export const revokeSessionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  revokedAt: z.string(),
  affected: z.object({
    userId: z.string(),
    sessionId: z.string(),
  }),
});

export type RevokeSessionResponse = z.infer<typeof revokeSessionResponseSchema>;

export const revokeAllSessionsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  revokedCount: z.number(),
  affected: z.object({
    userId: z.string(),
    sessionsRevoked: z.number(),
  }),
});

export type RevokeAllSessionsResponse = z.infer<typeof revokeAllSessionsResponseSchema>;
