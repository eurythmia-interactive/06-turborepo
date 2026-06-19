import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="mt-4 text-muted-foreground">Welcome to the admin portal.</p>
    </div>
  );
}
