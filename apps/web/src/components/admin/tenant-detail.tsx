'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Users, Calendar, Shield } from 'lucide-react';
import Link from 'next/link';
import type { TenantResponse } from '@repo/shared';
import { getTenantStatsAction } from '@/actions/tenants';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { TenantStatsResponse } from '@repo/shared';

interface TenantDetailProps {
  tenant: TenantResponse & { recentAuditLogs?: any[]; users?: any[] };
}

export function TenantDetail({ tenant }: TenantDetailProps) {
  const [stats, setStats] = useState<TenantStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const result = await getTenantStatsAction(tenant.id);
      if (result.success && result.data) {
        setStats(result.data);
      }
      setLoading(false);
    };
    fetchStats();
  }, [tenant.id]);

  const status = tenant.deletedAt ? 'Deleted' : tenant.suspended ? 'Suspended' : 'Active';
  const statusVariant = tenant.deletedAt
    ? 'destructive'
    : tenant.suspended
      ? 'secondary'
      : 'default';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/tenants">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{tenant.name}</h1>
            <Badge variant={statusVariant}>{status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {tenant.slug} • {tenant.plan} plan
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plan</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{tenant.plan}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Created</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Users by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Super Admins</p>
                    <p className="text-2xl font-bold">{stats.usersByRole.SUPER_ADMIN}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Admins</p>
                    <p className="text-2xl font-bold">{stats.usersByRole.ADMIN}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Members</p>
                    <p className="text-2xl font-bold">{stats.usersByRole.MEMBER}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Guests</p>
                    <p className="text-2xl font-bold">{stats.usersByRole.GUEST}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Users</CardTitle>
              <CardDescription>Users associated with this tenant</CardDescription>
            </CardHeader>
            <CardContent>
              {tenant.users && tenant.users.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenant.users.map((ut: any) => (
                      <TableRow key={ut.user.id}>
                        <TableCell>{ut.user.name || 'N/A'}</TableCell>
                        <TableCell>{ut.user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ut.user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ut.user.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {ut.user.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Last 10 audit log entries</CardDescription>
            </CardHeader>
            <CardContent>
              {tenant.recentAuditLogs && tenant.recentAuditLogs.length > 0 ? (
                <div className="space-y-4">
                  {tenant.recentAuditLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 border-b pb-4 last:border-0"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{log.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {log.user?.email || 'Unknown user'}
                        </p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No activity found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
