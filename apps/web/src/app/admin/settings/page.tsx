import type { Metadata } from 'next';
import { SettingsPanel } from '@/components/admin/settings-panel';

export const metadata: Metadata = {
  title: 'Settings | Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage system configuration and maintenance</p>
        </div>
      </div>
      <SettingsPanel />
    </div>
  );
}
