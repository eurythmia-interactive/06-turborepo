'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Mail, UserPlus } from 'lucide-react';
import { acceptInvitationAction } from '@/actions/invitations';
import { toast } from 'sonner';

interface InvitationDetails {
  email: string;
  tenantName: string | null;
  role: string;
  expiresAt: string;
  status: string;
}

interface InviteAcceptClientProps {
  token: string;
  invitation: InvitationDetails;
  isAuthenticated: boolean;
}

export function InviteAcceptClient({
  token,
  invitation,
  isAuthenticated,
}: InviteAcceptClientProps) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const router = useRouter();

  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isAccepted = invitation.status === 'accepted';

  async function handleAccept() {
    setLoading(true);
    const result = await acceptInvitationAction(token);

    if (result.success) {
      setAccepted(true);
      toast.success('Invitation accepted! Welcome aboard!');
      setTimeout(() => router.push('/dashboard'), 2000);
    } else {
      toast.error(result.message || 'Failed to accept invitation');
    }

    setLoading(false);
  }

  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="mx-4 max-w-md">
          <CardHeader>
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-4 dark:bg-red-950">
                <Mail className="size-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="mt-4 text-center text-2xl">Invitation Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              This invitation has expired. Please contact the administrator to request a new
              invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="mx-4 max-w-md">
          <CardHeader>
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4 dark:bg-green-950">
                <CheckCircle className="size-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="mt-4 text-center text-2xl">Invitation Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You have already accepted this invitation. Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="mx-4 max-w-md">
          <CardHeader>
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4 dark:bg-green-950">
                <CheckCircle className="size-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="mt-4 text-center text-2xl">Welcome!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You have successfully joined{' '}
              <strong>{invitation.tenantName || 'the platform'}</strong>. Redirecting to
              dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="mx-4 max-w-md">
        <CardHeader>
          <div className="flex justify-center">
            <div className="rounded-full bg-blue-100 p-4 dark:bg-blue-950">
              <UserPlus className="size-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="mt-4 text-center text-2xl">You're Invited!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">You've been invited to join</p>
            <p className="mt-1 text-lg font-semibold">{invitation.tenantName || 'the platform'}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              as a <strong className="capitalize">{invitation.role.toLowerCase()}</strong>
            </p>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Email:</strong> {invitation.email}
              <br />
              <strong>Expires:</strong> {new Date(invitation.expiresAt).toLocaleString()}
            </AlertDescription>
          </Alert>

          {isAuthenticated ? (
            <Button onClick={handleAccept} disabled={loading} className="w-full" size="lg">
              {loading ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={() => router.push(`/login?invitation=${token}`)}
                className="w-full"
                size="lg"
              >
                Sign In to Accept
              </Button>
              <Button
                onClick={() => router.push(`/register?invitation=${token}`)}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Create Account to Accept
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
