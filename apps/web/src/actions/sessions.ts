'use server';

import { serverApiClient } from '@/lib/server-api-client';
import {
  sessionListQuerySchema,
  type SessionListQuery,
  type SessionListResponse,
  type RevokeSessionResponse,
  type RevokeAllSessionsResponse,
} from '@repo/shared';

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function getSessionsAction(
  params: SessionListQuery,
): Promise<ActionResult<SessionListResponse>> {
  try {
    const validated = sessionListQuerySchema.parse(params);
    const searchParams = new URLSearchParams();
    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const result = await serverApiClient.get<SessionListResponse>(
      `/api/v1/admin/sessions?${searchParams.toString()}`,
    );

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch sessions',
    };
  }
}

export async function getUserSessionsAction(
  userId: string,
  params: SessionListQuery,
): Promise<ActionResult<SessionListResponse>> {
  try {
    const validated = sessionListQuerySchema.parse(params);
    const searchParams = new URLSearchParams();
    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const result = await serverApiClient.get<SessionListResponse>(
      `/api/v1/admin/sessions/user/${userId}?${searchParams.toString()}`,
    );

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch user sessions',
    };
  }
}

export async function getSessionSummaryAction(): Promise<
  ActionResult<{ totalActive: number; totalExpired: number; totalRevoked: number }>
> {
  try {
    const result = await serverApiClient.get<{
      totalActive: number;
      totalExpired: number;
      totalRevoked: number;
    }>(`/api/v1/admin/sessions/summary`);

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch session summary',
    };
  }
}

export async function revokeSessionAction(
  sessionId: string,
): Promise<ActionResult<RevokeSessionResponse>> {
  try {
    const result = await serverApiClient.delete<RevokeSessionResponse>(
      `/api/v1/admin/sessions/${sessionId}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to revoke session',
    };
  }
}

export async function revokeAllSessionsAction(
  userId: string,
): Promise<ActionResult<RevokeAllSessionsResponse>> {
  try {
    const result = await serverApiClient.delete<RevokeAllSessionsResponse>(
      `/api/v1/admin/sessions/user/${userId}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to revoke all sessions',
    };
  }
}
