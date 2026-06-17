import { Suspense } from 'react';
import { getDashboardStats } from '@/lib/data';
import { ViewTransitionLink } from '@/components/ViewTransitionLink';
import { ThemeToggle } from '@/components/theme-toggle';

async function StatsWidget() {
  const stats = await getDashboardStats();

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="mb-2 font-semibold">Cached Stats (use cache)</h2>
      <ul className="space-y-1 text-sm">
        <li>
          <span className="font-mono">totalUsers:</span> {stats.totalUsers}
        </li>
        <li>
          <span className="font-mono">activeSessions:</span> {stats.activeSessions}
        </li>
        <li>
          <span className="font-mono">lastUpdated:</span> {stats.lastUpdated}
        </li>
      </ul>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">@apps/web — Next.js 16</h1>
          <p className="text-muted-foreground">Monorepo bootstrap is online.</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Cache Components Demo</h2>

        <Suspense
          fallback={
            <div className="rounded-lg border bg-muted p-4 text-muted-foreground">
              Loading stats...
            </div>
          }
        >
          <StatsWidget />
        </Suspense>
      </div>

      <nav className="space-y-2">
        <h2 className="text-xl font-semibold">Example Routes</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <ViewTransitionLink href="/dashboard" className="text-primary underline">
              /dashboard — async searchParams + headers/cookies
            </ViewTransitionLink>
          </li>
          <li>
            <ViewTransitionLink href="/dashboard/123" className="text-primary underline">
              /dashboard/[id] — async params
            </ViewTransitionLink>
          </li>
          <li>
            <ViewTransitionLink href="/dashboard/profile" className="text-primary underline">
              /dashboard/profile — useOptimistic demo
            </ViewTransitionLink>
          </li>
        </ul>
      </nav>

      <nav className="space-y-2">
        <h2 className="text-xl font-semibold">Auth Routes</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <ViewTransitionLink href="/login" className="text-primary underline">
              /login — react-hook-form + useActionState
            </ViewTransitionLink>
          </li>
          <li>
            <ViewTransitionLink href="/register" className="text-primary underline">
              /register — multi-field form validation
            </ViewTransitionLink>
          </li>
        </ul>
      </nav>
    </main>
  );
}
