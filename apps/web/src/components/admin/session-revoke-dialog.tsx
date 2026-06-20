'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { revokeSessionAction } from '@/actions/sessions';
import { toast } from 'sonner';
import type { SessionResponse } from '@repo/shared';

interface SessionRevokeDialogProps {
  session: SessionResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRevoked?: () => void;
}

export function SessionRevokeDialog({
  session,
  open,
  onOpenChange,
  onRevoked,
}: SessionRevokeDialogProps) {
  const [revoking, setRevoking] = useState(false);

  if (!session) return null;

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      const result = await revokeSessionAction(session.id);
      if (result.success) {
        toast.success('Session revoked successfully');
        onOpenChange(false);
        onRevoked?.();
      } else {
        toast.error(result.message ?? 'Failed to revoke session');
      }
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Revoke Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to revoke this session? The user will be logged out immediately
            and will need to sign in again.
          </p>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">User</span>
              <span className="text-sm font-medium">{session.user.name ?? session.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Device</span>
              <span className="text-sm font-medium">
                {session.device?.browser} on {session.device?.os}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">IP Address</span>
              <span className="text-sm font-mono">{session.ip ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm">{new Date(session.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
            {revoking ? 'Revoking...' : 'Revoke Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
