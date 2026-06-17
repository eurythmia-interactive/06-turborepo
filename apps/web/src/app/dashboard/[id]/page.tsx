type Params = Promise<{ id: string }>;

export default async function DashboardDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Dashboard Item</h1>

      <div className="rounded border border-green-200 bg-green-50 p-4">
        <h2 className="mb-2 font-semibold">Async params</h2>
        <ul className="space-y-1 text-sm">
          <li>
            <span className="font-mono">id:</span> {id}
          </li>
        </ul>
      </div>

      <p className="text-gray-600">
        This page demonstrates Next.js 16 async route parameter resolution. The{' '}
        <code className="rounded bg-gray-100 px-1 font-mono text-sm">params</code> object is a
        Promise that must be awaited.
      </p>
    </main>
  );
}
