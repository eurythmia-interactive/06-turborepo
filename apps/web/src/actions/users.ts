'use server';

import { serverApiClient } from '@/lib/server-api-client';
import {
  addToTenantSchema,
  bulkRoleAssignSchema,
  bulkUserActionSchema,
  createUserSchema,
  suspendUserSchema,
  updateTenantRoleSchema,
  updateUserSchema,
  userListQuerySchema,
  type AddToTenantInput,
  type BulkRoleAssignInput,
  type BulkUserActionInput,
  type CreateUserInput,
  type SuspendUserInput,
  type UpdateTenantRoleInput,
  type UpdateUserInput,
  type UserListQuery,
  type UserResponse,
} from '@repo/shared';

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function getUsersAction(
  params: UserListQuery,
): Promise<ActionResult<{ data: UserResponse[]; pagination: any }>> {
  try {
    const validated = userListQuerySchema.parse(params);
    const searchParams = new URLSearchParams();
    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const result = await serverApiClient.get<{ data: UserResponse[]; pagination: any }>(
      `/api/v1/admin/users?${searchParams.toString()}`,
    );

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch users',
    };
  }
}

export async function getUserByIdAction(
  id: string,
): Promise<ActionResult<UserResponse & { recentAuditLogs?: any[] }>> {
  try {
    const result = await serverApiClient.get<UserResponse & { recentAuditLogs?: any[] }>(
      `/api/v1/admin/users/${id}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch user',
    };
  }
}

export async function createUserAction(data: CreateUserInput): Promise<ActionResult<UserResponse>> {
  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.post<UserResponse>('/api/v1/admin/users', parsed.data);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create user',
    };
  }
}

export async function updateUserAction(
  id: string,
  data: UpdateUserInput,
): Promise<ActionResult<UserResponse>> {
  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.patch<UserResponse>(
      `/api/v1/admin/users/${id}`,
      parsed.data,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update user',
    };
  }
}

export async function deleteUserAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const result = await serverApiClient.delete<{ success: boolean }>(`/api/v1/admin/users/${id}`);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
}

export async function suspendUserAction(
  id: string,
  data: SuspendUserInput,
): Promise<ActionResult<{ success: boolean }>> {
  const parsed = suspendUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.post<{ success: boolean }>(
      `/api/v1/admin/users/${id}/suspend`,
      parsed.data,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to suspend user',
    };
  }
}

export async function activateUserAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const result = await serverApiClient.post<{ success: boolean }>(
      `/api/v1/admin/users/${id}/activate`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to activate user',
    };
  }
}

export async function resetPasswordAction(
  id: string,
): Promise<ActionResult<{ tempPassword: string }>> {
  try {
    const result = await serverApiClient.post<{ tempPassword: string }>(
      `/api/v1/admin/users/${id}/reset-password`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset password',
    };
  }
}

export async function addToTenantAction(
  userId: string,
  data: AddToTenantInput,
): Promise<ActionResult<{ success: boolean }>> {
  const parsed = addToTenantSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.post<{ success: boolean }>(
      `/api/v1/admin/users/${userId}/tenants`,
      parsed.data,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add to tenant',
    };
  }
}

export async function removeFromTenantAction(
  userId: string,
  tenantId: string,
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const result = await serverApiClient.delete<{ success: boolean }>(
      `/api/v1/admin/users/${userId}/tenants/${tenantId}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to remove from tenant',
    };
  }
}

export async function updateTenantRoleAction(
  userId: string,
  tenantId: string,
  data: UpdateTenantRoleInput,
): Promise<ActionResult<{ success: boolean }>> {
  const parsed = updateTenantRoleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.patch<{ success: boolean }>(
      `/api/v1/admin/users/${userId}/tenants/${tenantId}`,
      parsed.data,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update tenant role',
    };
  }
}

export async function bulkSuspendAction(
  data: BulkUserActionInput,
): Promise<ActionResult<{ count: number }>> {
  const parsed = bulkUserActionSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.post<{ count: number }>(
      `/api/v1/admin/users/bulk/suspend`,
      parsed.data,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to bulk suspend',
    };
  }
}

export async function bulkActivateAction(
  data: BulkUserActionInput,
): Promise<ActionResult<{ count: number }>> {
  const parsed = bulkUserActionSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.post<{ count: number }>(
      `/api/v1/admin/users/bulk/activate`,
      parsed.data,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to bulk activate',
    };
  }
}

export async function bulkDeleteAction(
  data: BulkUserActionInput,
): Promise<ActionResult<{ count: number }>> {
  const parsed = bulkUserActionSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.post<{ count: number }>(
      `/api/v1/admin/users/bulk/delete`,
      parsed.data,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to bulk delete',
    };
  }
}

export async function bulkRoleAssignAction(
  data: BulkRoleAssignInput,
): Promise<ActionResult<{ count: number }>> {
  const parsed = bulkRoleAssignSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.post<{ count: number }>(
      `/api/v1/admin/users/bulk/role`,
      parsed.data,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to bulk assign role',
    };
  }
}
