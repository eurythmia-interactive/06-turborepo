import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTenantByIdAction } from '@/actions/tenants';
import { TenantDetail } from '@/components/admin/tenant-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getTenantByIdAction(id);

  if (!result.success || !result.data) {
    return {
      title: 'Tenant Not Found | Admin Dashboard',
    };
  }

  return {
    title: `${result.data.name} | Admin Dashboard`,
    robots: { index: false, follow: false },
  };
}

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await getTenantByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <TenantDetail tenant={result.data} />;
}
