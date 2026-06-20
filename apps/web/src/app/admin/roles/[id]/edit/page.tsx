import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRoleByIdAction } from '@/actions/roles';
import { RoleEdit } from '@/components/admin/role-edit';

export const metadata: Metadata = {
  title: 'Edit Role | Admin Dashboard',
  robots: { index: false, follow: false },
};

interface EditRolePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRolePage({ params }: EditRolePageProps) {
  const { id } = await params;
  const result = await getRoleByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <RoleEdit role={result.data} />;
}
