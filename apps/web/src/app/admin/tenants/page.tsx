import type { Metadata } from 'next';
import { TenantList } from '@/components/admin/tenant-list';

export const metadata: Metadata = {
  title: 'Tenants | Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function TenantsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">Manage all tenants in the system</p>
        </div>
      </div>
      <TenantList />
    </div>
  );
}
