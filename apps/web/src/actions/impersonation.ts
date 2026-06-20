'use server';

import { serverApiClient } from '@/lib/server-api-client';
import { cookies } from 'next/headers';

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export interface ImpersonationStatus {
  isImpersonating: boolean;
  targetUser?: {
    id: string;
    name: string | null;
    email: string;
  };
  expiresAt?: string;
}

export async function startImpersonationAction(
  userId: string,
  reason: string,
): Promise<ActionResult<{ accessToken: string; expiresAt: string }>> {
  try {
    const result = await serverApiClient.post<{ accessToken: string; expiresAt: string }>(
      '/api/v1/admin/impersonation/start',
      { userId, reason },
    );

    const cookieStore = await cookies();
    cookieStore.set('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(result.expiresAt),
    });

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start impersonation',
    };
  }
}

export async function stopImpersonationAction(): Promise<ActionResult<void>> {
  try {
    await serverApiClient.post('/api/v1/admin/impersonation/stop');

    const cookieStore = await cookies();
    cookieStore.delete('access_token');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to stop impersonation',
    };
  }
}

export async function getImpersonationStatusAction(): Promise<ActionResult<ImpersonationStatus>> {
  try {
    const result = await serverApiClient.get<ImpersonationStatus>(
      '/api/v1/admin/impersonation/status',
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get impersonation status',
    };
  }
}
