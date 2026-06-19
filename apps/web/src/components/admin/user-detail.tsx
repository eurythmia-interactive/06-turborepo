'use client';

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
import { ArrowLeft, Mail, Calendar, Shield, Clock } from 'lucide-react';
import Link from 'next/link';
import type { UserResponse } from '@repo/shared';

interface UserDetailProps {
  user: UserResponse & { recentAuditLogs?: any[]; tenants?: any[] };
}

export function UserDetail({ user }: UserDetailProps) {
  const status = user.status;
  const statusVariant =
    status === 'ACTIVE' ? 'default' : status === 'SUSPENDED' ? 'destructive' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{user.name || 'N/A'}</h1>
            <Badge variant={statusVariant}>{status}</Badge>
            {user.isSystem && <Badge variant="outline">System</Badge>}
          </div>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Email</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{user.email}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Global Role</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {user.role.toLowerCase().replace('_', ' ')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Created</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Login</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tenant Memberships</CardTitle>
              <CardDescription>Tenants this user belongs to</CardDescription>
            </CardHeader>
            <CardContent>
              {user.tenants && user.tenants.length > 0 ? (
                <div className="space-y-2">
                  {user.tenants.map((t: any) => (
                    <div
                      key={t.tenantId}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">{t.tenant?.name || t.tenantId}</p>
                        <p className="text-sm text-muted-foreground">{t.tenant?.slug}</p>
                      </div>
                      <Badge variant="outline">{t.role}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No tenant memberships</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Memberships</CardTitle>
              <CardDescription>Manage user's tenant assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {user.tenants && user.tenants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.tenants.map((t: any) => (
                      <TableRow key={t.tenantId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{t.tenant?.name || t.tenantId}</p>
                            <p className="text-sm text-muted-foreground">{t.tenant?.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{t.role}</Badge>
                        </TableCell>
                        <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No tenant memberships</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Last 20 audit log entries</CardDescription>
            </CardHeader>
            <CardContent>
              {user.recentAuditLogs && user.recentAuditLogs.length > 0 ? (
                <div className="space-y-4">
                  {user.recentAuditLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 border-b pb-4 last:border-0"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{log.action}</p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                        {log.ip && <p className="text-xs text-muted-foreground">IP: {log.ip}</p>}
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
