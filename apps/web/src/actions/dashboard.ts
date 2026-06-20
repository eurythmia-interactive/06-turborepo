'use server';

import { serverApiClient } from '@/lib/server-api-client';
import {
  type ActivityResponse,
  type DashboardMetricsResponse,
  type GrowthResponse,
  type RecentActivityResponse,
  type TimeRange,
  type Period,
} from '@repo/shared';

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export async function getDashboardMetricsAction(
  timeRange: TimeRange = 'month',
): Promise<ActionResult<DashboardMetricsResponse>> {
  try {
    const result = await serverApiClient.get<DashboardMetricsResponse>(
      `/api/v1/admin/dashboard/metrics?timeRange=${timeRange}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch dashboard metrics',
    };
  }
}

export async function getGrowthDataAction(
  metric: 'users' | 'tenants',
  period: Period = 'day',
  limit: number = 30,
): Promise<ActionResult<GrowthResponse>> {
  try {
    const result = await serverApiClient.get<GrowthResponse>(
      `/api/v1/admin/dashboard/growth?metric=${metric}&period=${period}&limit=${limit}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch growth data',
    };
  }
}

export async function getActivityDataAction(
  type: 'sessions' | 'users',
  period: Period = 'day',
  limit?: number,
): Promise<ActionResult<ActivityResponse>> {
  try {
    const params = new URLSearchParams({ type, period });
    if (limit) params.set('limit', String(limit));
    const result = await serverApiClient.get<ActivityResponse>(
      `/api/v1/admin/dashboard/activity?${params.toString()}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch activity data',
    };
  }
}

export async function getRecentActivityAction(
  limit: number = 20,
  type?: string,
): Promise<ActionResult<RecentActivityResponse>> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (type) params.set('type', type);
    const result = await serverApiClient.get<RecentActivityResponse>(
      `/api/v1/admin/dashboard/recent?${params.toString()}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch recent activity',
    };
  }
}
