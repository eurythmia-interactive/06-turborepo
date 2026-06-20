'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { startImpersonationAction } from '@/actions/impersonation';
import type { UserResponse } from '@repo/shared';
import { toast } from 'sonner';

interface ImpersonateButtonProps {
  user: UserResponse;
  onClose: () => void;
}

export function ImpersonateButton({ user, onClose }: ImpersonateButtonProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleImpersonate = async () => {
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await startImpersonationAction(user.id, reason);

    if (result.success) {
      toast.success(`Now impersonating ${user.email}`);
      onClose();
      router.push('/dashboard');
    } else {
      setError(result.message || 'Failed to start impersonation');
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Impersonate User</DialogTitle>
          <DialogDescription>
            You will be logged in as <strong>{user.email}</strong>. All actions performed will be
            logged and attributed to you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer support, debugging issue..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be logged for audit purposes.
            </p>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Important:</strong> Impersonation expires after 1 hour. You can stop it at any
              time using the banner that will appear.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleImpersonate} disabled={loading}>
            {loading ? 'Starting...' : 'Start Impersonation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
