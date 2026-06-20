'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Building2, Shield, Key, FileText, Settings } from 'lucide-react';
import Link from 'next/link';

const actions = [
  {
    id: 'create-user',
    name: 'Create User',
    description: 'Add a new user to the platform',
    icon: UserPlus,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    href: '/admin/users',
  },
  {
    id: 'create-tenant',
    name: 'Create Tenant',
    description: 'Set up a new tenant organization',
    icon: Building2,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    href: '/admin/tenants',
  },
  {
    id: 'create-role',
    name: 'Create Role',
    description: 'Define a new custom role',
    icon: Key,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    href: '/admin/roles',
  },
  {
    id: 'view-roles',
    name: 'Manage Roles',
    description: 'View and edit role permissions',
    icon: Shield,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    href: '/admin/roles',
  },
  {
    id: 'view-audit',
    name: 'Audit Logs',
    description: 'Review system activity history',
    icon: FileText,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950',
    href: '/admin/audit',
  },
  {
    id: 'system-settings',
    name: 'Settings',
    description: 'Configure system preferences',
    icon: Settings,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    href: '/admin/settings',
  },
];

export function QuickActionsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                href={action.href}
                className="group flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:border-primary hover:shadow-sm"
              >
                <div
                  className={`rounded-lg ${action.bgColor} p-3 ${action.color} transition-transform group-hover:scale-110`}
                >
                  <Icon className="size-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{action.name}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
