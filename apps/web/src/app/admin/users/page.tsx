import type { Metadata } from 'next';
import { UserList } from '@/components/admin/user-list';

export const metadata: Metadata = {
  title: 'Users | Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage all users in the system</p>
        </div>
      </div>
      <UserList />
    </div>
  );
}
