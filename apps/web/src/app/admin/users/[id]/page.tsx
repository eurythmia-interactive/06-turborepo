import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getUserByIdAction } from '@/actions/users';
import { UserDetail } from '@/components/admin/user-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getUserByIdAction(id);

  if (!result.success || !result.data) {
    return {
      title: 'User Not Found | Admin Dashboard',
    };
  }

  return {
    title: `${result.data.name || result.data.email} | Admin Dashboard`,
    robots: { index: false, follow: false },
  };
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await getUserByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <UserDetail user={result.data} />;
}
