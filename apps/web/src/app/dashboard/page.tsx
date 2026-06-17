import { Suspense } from 'react';
import { cookies, headers } from 'next/headers';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

async function UserInfo() {
  const headersList = await headers();
  const cookieStore = await cookies();

  const userAgent = headersList.get('user-agent') ?? 'Unknown';
  const sessionId = cookieStore.get('session-id')?.value ?? 'none';

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="mb-2 font-semibold">Request Context (Async)</h2>
      <ul className="space-y-1 text-sm">
        <li>
          <span className="font-mono">headers():</span> {userAgent.slice(0, 60)}...
        </li>
        <li>
          <span className="font-mono">cookies():</span> session-id={sessionId}
        </li>
      </ul>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = params.filter ?? 'all';
  const page = params.page ?? '1';

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader title="Dashboard" description="Overview of your account and activity">
        <div className="text-sm text-muted-foreground">
          Filter: {filter} | Page: {page}
        </div>
      </PageHeader>

      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="mb-2 font-semibold">Async searchParams</h2>
        <ul className="space-y-1 text-sm">
          <li>
            <span className="font-mono">filter:</span> {filter}
          </li>
          <li>
            <span className="font-mono">page:</span> {page}
          </li>
        </ul>
      </div>

      <Suspense
        fallback={
          <div className="rounded-lg border bg-muted p-4 text-muted-foreground">
            Loading request context...
          </div>
        }
      >
        <UserInfo />
      </Suspense>
    </div>
  );
}
