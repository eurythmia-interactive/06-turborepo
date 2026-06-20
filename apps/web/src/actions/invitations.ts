'use server';

import { serverApiClient } from '@/lib/server-api-client';
import {
  createInvitationSchema,
  invitationListQuerySchema,
  type CreateInvitationInput,
  type InvitationListQuery,
  type InvitationResponse,
} from '@repo/shared';

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createInvitationAction(
  input: CreateInvitationInput,
): Promise<ActionResult<InvitationResponse>> {
  try {
    const validated = createInvitationSchema.parse(input);
    const result = await serverApiClient.post<InvitationResponse>(
      '/api/v1/admin/invitations',
      validated,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create invitation',
    };
  }
}

export async function getInvitationsAction(
  query?: InvitationListQuery,
): Promise<ActionResult<InvitationResponse[]>> {
  try {
    const params = new URLSearchParams();
    if (query?.tenantId) params.append('tenantId', query.tenantId);
    if (query?.status) params.append('status', query.status);

    const result = await serverApiClient.get<InvitationResponse[]>(
      `/api/v1/admin/invitations${params.toString() ? `?${params.toString()}` : ''}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch invitations',
    };
  }
}

export async function resendInvitationAction(id: string): Promise<ActionResult<void>> {
  try {
    await serverApiClient.post(`/api/v1/admin/invitations/${id}/resend`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to resend invitation',
    };
  }
}

export async function cancelInvitationAction(id: string): Promise<ActionResult<void>> {
  try {
    await serverApiClient.delete(`/api/v1/admin/invitations/${id}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to cancel invitation',
    };
  }
}

export async function getInvitationByTokenAction(token: string): Promise<
  ActionResult<{
    email: string;
    tenantName: string | null;
    role: string;
    expiresAt: string;
    status: string;
  }>
> {
  try {
    const result = await serverApiClient.get(`/api/v1/invitations/${token}`);
    return { success: true, data: result as any };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch invitation',
    };
  }
}

export async function acceptInvitationAction(token: string): Promise<ActionResult<void>> {
  try {
    await serverApiClient.post(`/api/v1/invitations/${token}/accept`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to accept invitation',
    };
  }
}
