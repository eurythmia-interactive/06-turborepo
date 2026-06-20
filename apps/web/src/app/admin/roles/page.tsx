import type { Metadata } from 'next';
import { RoleList } from '@/components/admin/role-list';

export const metadata: Metadata = {
  title: 'Roles | Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roles</h1>
          <p className="text-muted-foreground">Manage roles and permissions</p>
        </div>
      </div>
      <RoleList />
    </div>
  );
}
