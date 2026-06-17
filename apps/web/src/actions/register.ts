'use server';

import { registerSchema, type RegisterInput, type RegisterResponse } from '@repo/shared';
import { serverApiClient } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';

export type AuthActionResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function registerAction(
  _prevState: AuthActionResult<RegisterResponse> | null,
  formData: FormData,
): Promise<AuthActionResult<RegisterResponse>> {
  const raw = {
    email: formData.get('email') as string,
    name: formData.get('name') as string | undefined,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data: RegisterInput = parsed.data;

  try {
    const result = await serverApiClient.post<RegisterResponse>('/api/v1/auth/register', data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        message: (error.data as { message?: string })?.message ?? 'Registration failed',
      };
    }
    return {
      success: false,
      message: 'Unable to reach the server. Please try again.',
    };
  }
}
