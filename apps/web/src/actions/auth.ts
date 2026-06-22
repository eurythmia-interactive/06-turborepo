'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginSchema, type LoginInput, type LoginResponse } from '@repo/shared';
import { serverApiClient } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';

export type AuthActionResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function loginAction(
  _prevState: AuthActionResult<LoginResponse> | null,
  formData: FormData,
): Promise<AuthActionResult<LoginResponse>> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data: LoginInput = parsed.data;

  try {
    const result = await serverApiClient.post<LoginResponse>('/api/v1/auth/login', data);

    const cookieStore = await cookies();

    cookieStore.set('access_token', result.accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    cookieStore.set('user_id', result.user.id, {
      path: '/',
    });

    cookieStore.set('user_email', result.user.email, {
      path: '/',
    });

    cookieStore.set('user_role', result.user.role, {
      path: '/',
    });

    // Redirect based on role - this ensures cookies are sent with the redirect
    const role = result.user.role;
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  } catch (error) {
    // Handle redirect errors separately
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }

    console.error('Login action error:', error);
    if (error instanceof ApiError) {
      return {
        success: false,
        message: (error.data as { message?: string })?.message ?? 'Invalid credentials',
      };
    }
    return {
      success: false,
      message: `Unable to reach the server. Please try again. Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete('access_token');
  cookieStore.delete('user_id');
  cookieStore.delete('user_email');
  cookieStore.delete('user_role');

  try {
    await serverApiClient.post('/api/v1/auth/logout');
  } catch (error) {
    console.error('Logout API error:', error);
  }
}
