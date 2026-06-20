import type { Metadata } from 'next';
import { SessionList } from '@/components/admin/session-list';

export const metadata: Metadata = {
  title: 'Sessions | Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">Monitor and manage user sessions</p>
        </div>
      </div>
      <SessionList />
    </div>
  );
}
