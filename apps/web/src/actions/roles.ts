'use server';

import { serverApiClient } from '@/lib/server-api-client';
import {
  assignPermissionsSchema,
  createRoleSchema,
  roleListQuerySchema,
  updateRoleSchema,
  type AssignPermissionsInput,
  type CreateRoleInput,
  type RoleDetailResponse,
  type RoleListQuery,
  type RoleResponse,
  type UpdateRoleInput,
} from '@repo/shared';

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function getRolesAction(
  params: RoleListQuery,
): Promise<
  ActionResult<{
    data: RoleResponse[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>
> {
  try {
    const validated = roleListQuerySchema.parse(params);
    const searchParams = new URLSearchParams();
    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const result = await serverApiClient.get<{
      data: RoleResponse[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/v1/admin/roles?${searchParams.toString()}`);

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch roles',
    };
  }
}

export async function getRoleByIdAction(id: string): Promise<ActionResult<RoleDetailResponse>> {
  try {
    const result = await serverApiClient.get<RoleDetailResponse>(`/api/v1/admin/roles/${id}`);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch role',
    };
  }
}

export async function getRoleByNameAction(name: string): Promise<ActionResult<RoleResponse>> {
  try {
    const result = await serverApiClient.get<RoleResponse>(
      `/api/v1/admin/roles/name/${encodeURIComponent(name)}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch role',
    };
  }
}

export async function createRoleAction(data: CreateRoleInput): Promise<ActionResult<RoleResponse>> {
  const parsed = createRoleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.post<RoleResponse>('/api/v1/admin/roles', parsed.data);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create role',
    };
  }
}

export async function updateRoleAction(
  id: string,
  data: UpdateRoleInput,
): Promise<ActionResult<RoleResponse>> {
  const parsed = updateRoleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.patch<RoleResponse>(
      `/api/v1/admin/roles/${id}`,
      parsed.data,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update role',
    };
  }
}

export async function deleteRoleAction(
  id: string,
  reassignTo?: string,
): Promise<ActionResult<{ success: boolean; message: string }>> {
  try {
    const result = await serverApiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/admin/roles/${id}`,
      {
        headers: { 'Content-Type': 'application/json' },
        body: reassignTo ? JSON.stringify({ reassignTo }) : undefined,
      },
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete role',
    };
  }
}

export async function assignPermissionsAction(
  id: string,
  data: AssignPermissionsInput,
): Promise<ActionResult<{ id: string; name: string; permissions: string[] }>> {
  const parsed = assignPermissionsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.put<{ id: string; name: string; permissions: string[] }>(
      `/api/v1/admin/roles/${id}/permissions`,
      parsed.data,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to assign permissions',
    };
  }
}
