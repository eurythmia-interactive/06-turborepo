'use server';

import { serverApiClient } from '@/lib/server-api-client';
import {
  createTenantSchema,
  suspendTenantSchema,
  tenantListQuerySchema,
  updateTenantSchema,
  type CreateTenantInput,
  type SuspendTenantInput,
  type TenantListQuery,
  type TenantResponse,
  type TenantStatsResponse,
  type UpdateTenantInput,
} from '@repo/shared';

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function getTenantsAction(
  params: TenantListQuery,
): Promise<ActionResult<{ data: TenantResponse[]; pagination: any }>> {
  try {
    const validated = tenantListQuerySchema.parse(params);
    const searchParams = new URLSearchParams();
    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const result = await serverApiClient.get<{ data: TenantResponse[]; pagination: any }>(
      `/api/v1/admin/tenants?${searchParams.toString()}`,
    );

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch tenants',
    };
  }
}

export async function getTenantByIdAction(
  id: string,
): Promise<ActionResult<TenantResponse & { recentAuditLogs?: any[] }>> {
  try {
    const result = await serverApiClient.get<TenantResponse & { recentAuditLogs?: any[] }>(
      `/api/v1/admin/tenants/${id}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch tenant',
    };
  }
}

export async function createTenantAction(
  data: CreateTenantInput,
): Promise<ActionResult<{ tenant: TenantResponse; tempPassword?: string; adminUser: any }>> {
  const parsed = createTenantSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.post<{
      tenant: TenantResponse;
      tempPassword?: string;
      adminUser: any;
    }>('/api/v1/admin/tenants', parsed.data);

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create tenant',
    };
  }
}

export async function updateTenantAction(
  id: string,
  data: UpdateTenantInput,
): Promise<ActionResult<TenantResponse>> {
  const parsed = updateTenantSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.patch<TenantResponse>(
      `/api/v1/admin/tenants/${id}`,
      parsed.data,
    );

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update tenant',
    };
  }
}

export async function deleteTenantAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const result = await serverApiClient.delete<{ success: boolean }>(
      `/api/v1/admin/tenants/${id}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete tenant',
    };
  }
}

export async function suspendTenantAction(
  id: string,
  data: SuspendTenantInput,
): Promise<ActionResult<{ success: boolean }>> {
  const parsed = suspendTenantSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await serverApiClient.post<{ success: boolean }>(
      `/api/v1/admin/tenants/${id}/suspend`,
      parsed.data,
    );

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to suspend tenant',
    };
  }
}

export async function restoreTenantAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const result = await serverApiClient.post<{ success: boolean }>(
      `/api/v1/admin/tenants/${id}/restore`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to restore tenant',
    };
  }
}

export async function getTenantStatsAction(id: string): Promise<ActionResult<TenantStatsResponse>> {
  try {
    const result = await serverApiClient.get<TenantStatsResponse>(
      `/api/v1/admin/tenants/${id}/stats`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch tenant stats',
    };
  }
}
