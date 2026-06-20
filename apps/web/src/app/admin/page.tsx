import type { Metadata } from 'next';
import { DashboardClient } from '@/components/admin/dashboard-client';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return <DashboardClient />;
}
