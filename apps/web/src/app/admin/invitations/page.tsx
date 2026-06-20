'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { InvitationList } from '@/components/admin/invitation-list';
import { InvitationDialog } from '@/components/admin/invitation-dialog';

export default function InvitationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invitations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage user invitations and track their status.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="mr-2 size-4" />
          Invite User
        </Button>
      </div>

      <InvitationList key={refreshKey} />

      <InvitationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
