'use client';

import { useCallback, useEffect, useState } from 'react';
import { MetricCards } from '@/components/admin/metric-cards';
import { UserGrowthChart } from '@/components/admin/charts/user-growth-chart';
import { TenantActivityChart } from '@/components/admin/charts/tenant-activity-chart';
import { RecentActivityFeed } from '@/components/admin/recent-activity-feed';
import { QuickActionsWidget } from '@/components/admin/quick-actions-widget';
import {
  getDashboardMetricsAction,
  getGrowthDataAction,
  getActivityDataAction,
  getRecentActivityAction,
} from '@/actions/dashboard';
import type {
  DashboardMetricsResponse,
  GrowthResponse,
  ActivityResponse,
  RecentActivityResponse,
  TimeRange,
} from '@repo/shared';
import { RefreshCw } from 'lucide-react';

const REFRESH_INTERVAL = 30000;

export function DashboardClient() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [growthData, setGrowthData] = useState<GrowthResponse | null>(null);
  const [activityData, setActivityData] = useState<ActivityResponse | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, growthRes, activityRes, recentRes] = await Promise.all([
        getDashboardMetricsAction(timeRange),
        getGrowthDataAction('users', 'day', 30),
        getActivityDataAction('sessions', 'day'),
        getRecentActivityAction(10),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data!);
      if (growthRes.success) setGrowthData(growthRes.data!);
      if (activityRes.success) setActivityData(activityRes.data!);
      if (recentRes.success) setRecentActivity(recentRes.data!);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          {lastUpdated && (
            <p className="mt-1 text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 90 days</option>
            <option value="year">Last 365 days</option>
          </select>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </div>

      <MetricCards metrics={metrics} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <UserGrowthChart data={growthData} loading={loading} />
        <TenantActivityChart data={activityData} loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivityFeed data={recentActivity} loading={loading} />
        </div>
        <QuickActionsWidget />
      </div>
    </div>
  );
}
