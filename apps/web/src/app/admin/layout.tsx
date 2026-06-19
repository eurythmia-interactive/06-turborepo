import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return <AdminLayout>{children}</AdminLayout>;
}
