'use server';

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
    return { success: true, data: result };
  } catch (error) {
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
