'use server';

import { serverApiClient } from '@/lib/server-api-client';
import { enableMaintenanceSchema, type EnableMaintenanceInput } from '@repo/shared';

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export interface MaintenanceStatus {
  enabled: boolean;
  message?: string;
  scheduledEnd?: string;
}

export async function getMaintenanceStatusAction(): Promise<ActionResult<MaintenanceStatus>> {
  try {
    const result = await serverApiClient.get<MaintenanceStatus>(
      '/api/v1/admin/system/maintenance/status',
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch maintenance status',
    };
  }
}

export async function enableMaintenanceAction(
  input: EnableMaintenanceInput,
): Promise<ActionResult<void>> {
  try {
    const validated = enableMaintenanceSchema.parse(input);
    await serverApiClient.post('/api/v1/admin/system/maintenance/enable', validated);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to enable maintenance mode',
    };
  }
}

export async function disableMaintenanceAction(): Promise<ActionResult<void>> {
  try {
    await serverApiClient.post('/api/v1/admin/system/maintenance/disable');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to disable maintenance mode',
    };
  }
}
