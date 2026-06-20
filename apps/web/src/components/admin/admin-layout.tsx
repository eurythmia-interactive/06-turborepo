'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Home, Key, Shield, Users, FileText, Monitor, Settings, Mail } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SessionTimeoutWarning } from './session-timeout-warning';
import { MaintenanceToggle } from './maintenance-toggle';
import { ImpersonationBanner } from './impersonation-banner';

const adminMenuItems = [
  { title: 'Dashboard', href: '/admin', icon: Home },
  { title: 'Users', href: '/admin/users', icon: Users },
  { title: 'Tenants', href: '/admin/tenants', icon: Shield },
  { title: 'Roles', href: '/admin/roles', icon: Key },
  { title: 'Audit Logs', href: '/admin/audit', icon: FileText },
  { title: 'Sessions', href: '/admin/sessions', icon: Monitor },
  { title: 'Invitations', href: '/admin/invitations', icon: Mail },
  { title: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <Shield className="size-5" />
              <span className="text-lg font-bold">Admin Portal</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 p-6">
          <ImpersonationBanner />
          <SessionTimeoutWarning />
          <div className="mb-6">
            <MaintenanceToggle />
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
