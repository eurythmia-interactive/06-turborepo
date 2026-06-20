import type { Metadata } from 'next';
import { AuditLogList } from '@/components/admin/audit-log-list';

export const metadata: Metadata = {
  title: 'Audit Logs | Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">View and search system activity logs</p>
        </div>
      </div>
      <AuditLogList />
    </div>
  );
}
