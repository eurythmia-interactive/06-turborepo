'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ActivityResponse } from '@repo/shared';

interface TenantActivityChartProps {
  data: ActivityResponse | null;
  loading?: boolean;
}

export function TenantActivityChart({ data, loading }: TenantActivityChartProps) {
  if (loading || !data) {
    return <TenantActivityChartSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {data.type === 'sessions' ? 'Login Activity' : 'User Registrations'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Bar
                dataKey="value"
                name={data.type === 'sessions' ? 'Logins' : 'New Users'}
                fill="hsl(var(--chart-3))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{data.summary.total}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Average</p>
            <p className="text-lg font-semibold">{data.summary.average}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Peak</p>
            <p className="text-lg font-semibold">{data.summary.peak.value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TenantActivityChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 text-center">
              <Skeleton className="mx-auto h-4 w-16" />
              <Skeleton className="mx-auto h-6 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
