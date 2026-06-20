'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserCheck,
  UserPlus,
  Building2,
  Building,
  Activity,
  LogIn,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { DashboardMetricsResponse } from '@repo/shared';

interface MetricCardsProps {
  metrics: DashboardMetricsResponse | null;
  loading?: boolean;
}

interface MetricCardData {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  color: string;
}

export function MetricCards({ metrics, loading }: MetricCardsProps) {
  if (loading || !metrics) {
    return <MetricCardsSkeleton />;
  }

  const cards: MetricCardData[] = [
    {
      title: 'Total Users',
      value: metrics.users.total.toLocaleString(),
      icon: Users,
      trend: metrics.users.growth,
      trendLabel: 'vs prev period',
      color: 'text-blue-600',
    },
    {
      title: 'Active Users',
      value: metrics.users.active.toLocaleString(),
      icon: UserCheck,
      color: 'text-green-600',
    },
    {
      title: 'New Users Today',
      value: metrics.users.newToday,
      icon: UserPlus,
      color: 'text-purple-600',
    },
    {
      title: 'New Users This Week',
      value: metrics.users.newThisWeek,
      icon: UserPlus,
      color: 'text-indigo-600',
    },
    {
      title: 'Total Tenants',
      value: metrics.tenants.total.toLocaleString(),
      icon: Building2,
      color: 'text-orange-600',
    },
    {
      title: 'Active Tenants',
      value: metrics.tenants.active.toLocaleString(),
      icon: Building,
      color: 'text-teal-600',
    },
    {
      title: 'Sessions Today',
      value: metrics.activity.totalSessionsToday,
      icon: LogIn,
      trend: metrics.activity.trend,
      trendLabel: 'vs yesterday',
      color: 'text-cyan-600',
    },
    {
      title: 'Active Tenants Today',
      value: metrics.activity.activeTenantsToday,
      icon: Activity,
      color: 'text-pink-600',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <MetricCard key={card.title} {...card} />
      ))}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, trendLabel, color }: MetricCardData) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 text-xs">
                {isPositive ? (
                  <TrendingUp className="size-3 text-green-600" />
                ) : (
                  <TrendingDown className="size-3 text-red-600" />
                )}
                <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                  {isPositive ? '+' : ''}
                  {trend}%
                </span>
                {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className={`rounded-lg bg-muted p-3 ${color}`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="size-11 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
