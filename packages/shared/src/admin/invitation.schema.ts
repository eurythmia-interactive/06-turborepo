import { z } from 'zod';

export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  tenantId: z.string().optional(),
  role: z.enum(['ADMIN', 'MEMBER', 'GUEST']).default('MEMBER'),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const invitationResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  tenantId: z.string().nullable(),
  role: z.string(),
  status: z.enum(['pending', 'accepted', 'expired', 'canceled']),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable(),
});

export type InvitationResponse = z.infer<typeof invitationResponseSchema>;

export const invitationListQuerySchema = z.object({
  tenantId: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'expired', 'canceled']).optional(),
});

export type InvitationListQuery = z.infer<typeof invitationListQuerySchema>;
