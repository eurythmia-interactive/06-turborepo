import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getInvitationByTokenAction } from '@/actions/invitations';
import { InviteAcceptClient } from './page-client';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const session = await getSession();

  const result = await getInvitationByTokenAction(token);

  if (!result.success || !result.data) {
    redirect('/');
  }

  const invitation = result.data;

  return <InviteAcceptClient token={token} invitation={invitation} isAuthenticated={!!session} />;
}
