'use server';

import { serverApiClient } from '@/lib/server-api-client';

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export interface IpEntry {
  ip: string;
  addedAt: string;
}

export async function getIpAllowlistAction(): Promise<ActionResult<IpEntry[]>> {
  try {
    const result = await serverApiClient.get<IpEntry[]>('/api/v1/admin/ip-allowlist');
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch IP allowlist',
    };
  }
}

export async function addIpAllowlistAction(ip: string): Promise<ActionResult<void>> {
  try {
    await serverApiClient.post('/api/v1/admin/ip-allowlist', { ip });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add IP',
    };
  }
}

export async function removeIpAllowlistAction(ip: string): Promise<ActionResult<void>> {
  try {
    await serverApiClient.delete(`/api/v1/admin/ip-allowlist/${encodeURIComponent(ip)}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to remove IP',
    };
  }
}
