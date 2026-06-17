'use server';

import { profileUpdateSchema, type ProfileUpdateInput, type ProfileResponse } from '@repo/shared';
import { serverApiClient } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';

export type ProfileActionResult = {
  success: boolean;
  data?: ProfileResponse;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function updateProfileAction(
  _prevState: ProfileActionResult | null,
  formData: FormData,
): Promise<ProfileActionResult> {
  const raw = {
    name: formData.get('name') as string | undefined,
    image: formData.get('image') as string | undefined,
  };

  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data: ProfileUpdateInput = parsed.data;

  try {
    const result = await serverApiClient.patch<ProfileResponse>('/api/v1/auth/profile', data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        message: (error.data as { message?: string })?.message ?? 'Profile update failed',
      };
    }
    return {
      success: false,
      message: 'Unable to reach the server. Please try again.',
    };
  }
}
