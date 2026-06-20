'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  UserPlus,
  UserMinus,
  UserX,
  Building2,
  LogIn,
  LogOut,
  AlertCircle,
  Shield,
  Key,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import type { RecentActivityResponse } from '@repo/shared';

interface RecentActivityFeedProps {
  data: RecentActivityResponse | null;
  loading?: boolean;
}

const eventConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  'auth.login': { icon: LogIn, color: 'text-green-600', label: 'Login' },
  'auth.logout': { icon: LogOut, color: 'text-gray-600', label: 'Logout' },
  'auth.failed': { icon: AlertCircle, color: 'text-red-600', label: 'Failed Login' },
  'user.created': { icon: UserPlus, color: 'text-blue-600', label: 'User Created' },
  'user.deleted': { icon: UserMinus, color: 'text-red-600', label: 'User Deleted' },
  'user.suspended': { icon: UserX, color: 'text-orange-600', label: 'User Suspended' },
  'user.activated': { icon: UserPlus, color: 'text-green-600', label: 'User Activated' },
  'user.updated': { icon: Settings, color: 'text-gray-600', label: 'User Updated' },
  'tenant.created': { icon: Building2, color: 'text-green-600', label: 'Tenant Created' },
  'tenant.suspended': { icon: Building2, color: 'text-orange-600', label: 'Tenant Suspended' },
  'tenant.updated': { icon: Building2, color: 'text-blue-600', label: 'Tenant Updated' },
  'role.created': { icon: Shield, color: 'text-purple-600', label: 'Role Created' },
  'role.updated': { icon: Shield, color: 'text-purple-600', label: 'Role Updated' },
  'role.deleted': { icon: Shield, color: 'text-red-600', label: 'Role Deleted' },
  'role.permissions': { icon: Key, color: 'text-purple-600', label: 'Permissions Changed' },
};

function getEventConfig(action: string) {
  return eventConfig[action] || { icon: Settings, color: 'text-gray-600', label: action };
}

function formatAction(action: string, userName: string | null, tenantName?: string | null): string {
  const name = userName || 'Unknown';
  const tenant = tenantName ? ` in ${tenantName}` : '';

  switch (action) {
    case 'auth.login':
      return `${name} logged in${tenant}`;
    case 'auth.logout':
      return `${name} logged out`;
    case 'auth.failed':
      return `Failed login attempt by ${name}`;
    case 'user.created':
      return `${name} created a user${tenant}`;
    case 'user.deleted':
      return `${name} deleted a user${tenant}`;
    case 'user.suspended':
      return `${name} suspended a user${tenant}`;
    case 'user.activated':
      return `${name} activated a user${tenant}`;
    case 'user.updated':
      return `${name} updated a user${tenant}`;
    case 'tenant.created':
      return `${name} created tenant "${tenantName || ''}"`;
    case 'tenant.suspended':
      return `${name} suspended tenant "${tenantName || ''}"`;
    case 'tenant.updated':
      return `${name} updated tenant "${tenantName || ''}"`;
    case 'role.created':
      return `${name} created a role${tenant}`;
    case 'role.updated':
      return `${name} updated a role${tenant}`;
    case 'role.deleted':
      return `${name} deleted a role${tenant}`;
    case 'role.permissions':
      return `${name} changed role permissions${tenant}`;
    default:
      return `${name} performed ${action}${tenant}`;
  }
}

export function RecentActivityFeed({ data, loading }: RecentActivityFeedProps) {
  if (loading || !data) {
    return <RecentActivityFeedSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <Link href="/admin/audit" className="text-sm text-muted-foreground hover:text-foreground">
          View All
        </Link>
      </CardHeader>
      <CardContent>
        {data.events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="relative space-y-4 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-border">
            {data.events.map((event) => {
              const config = getEventConfig(event.action);
              const Icon = config.icon;

              return (
                <div key={event.id} className="relative flex gap-4 pl-10">
                  <div
                    className={`absolute left-0 top-0.5 flex size-8 items-center justify-center rounded-full bg-muted ${config.color}`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      {formatAction(event.action, event.user.name, event.tenant?.name)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{event.timeAgo}</span>
                      {event.tenant && (
                        <>
                          <span>·</span>
                          <Badge variant="outline" className="text-xs">
                            {event.tenant.name}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivityFeedSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
