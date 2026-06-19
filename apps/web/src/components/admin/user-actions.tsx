'use client';

import { useState } from 'react';
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
import {
  suspendUserAction,
  activateUserAction,
  resetPasswordAction,
  deleteUserAction,
} from '@/actions/users';
import type { UserResponse } from '@repo/shared';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface UserActionsProps {
  user: UserResponse;
  actionType: 'suspend' | 'activate' | 'reset-password' | 'delete';
  onClose: () => void;
  onSuccess: () => void;
}

export function UserActions({ user, actionType, onClose, onSuccess }: UserActionsProps) {
  const [reason, setReason] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const isOpen = true;

  const handleSuspend = async () => {
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await suspendUserAction(user.id, { reason });

    if (result.success) {
      toast.success('User suspended successfully');
      onSuccess();
      onClose();
    } else {
      setError(result.message || 'Failed to suspend user');
    }

    setLoading(false);
  };

  const handleActivate = async () => {
    setLoading(true);
    setError(null);

    const result = await activateUserAction(user.id);

    if (result.success) {
      toast.success('User activated successfully');
      onSuccess();
      onClose();
    } else {
      setError(result.message || 'Failed to activate user');
    }

    setLoading(false);
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setError(null);

    const result = await resetPasswordAction(user.id);

    if (result.success && result.data) {
      setTempPassword(result.data.tempPassword);
      toast.success('Password reset successfully');
    } else {
      setError(result.message || 'Failed to reset password');
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (confirmEmail !== user.email) {
      setError('Email does not match');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await deleteUserAction(user.id);

    if (result.success) {
      toast.success('User deleted successfully');
      onSuccess();
      onClose();
    } else {
      setError(result.message || 'Failed to delete user');
    }

    setLoading(false);
  };

  const getTitle = () => {
    switch (actionType) {
      case 'suspend':
        return 'Suspend User';
      case 'activate':
        return 'Activate User';
      case 'reset-password':
        return 'Reset Password';
      case 'delete':
        return 'Delete User';
    }
  };

  const getDescription = () => {
    switch (actionType) {
      case 'suspend':
        return `Suspend "${user.email}"? The user will not be able to log in.`;
      case 'activate':
        return `Activate "${user.email}"? The user will be able to log in again.`;
      case 'reset-password':
        return `Reset password for "${user.email}"? A temporary password will be generated and all sessions will be invalidated.`;
      case 'delete':
        return `Delete "${user.email}"? This action cannot be undone.`;
    }
  };

  const getButtonVariant = () => {
    switch (actionType) {
      case 'suspend':
        return 'default';
      case 'activate':
        return 'default';
      case 'reset-password':
        return 'default';
      case 'delete':
        return 'destructive';
    }
  };

  const getButtonText = () => {
    switch (actionType) {
      case 'suspend':
        return 'Suspend User';
      case 'activate':
        return 'Activate User';
      case 'reset-password':
        return 'Reset Password';
      case 'delete':
        return 'Delete User';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {actionType === 'suspend' && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for suspension..."
                rows={3}
              />
            </div>
          )}

          {actionType === 'reset-password' && tempPassword && (
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex gap-2">
                <Input value={tempPassword} readOnly className="font-mono" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    toast.success('Password copied to clipboard');
                  }}
                >
                  Copy
                </Button>
              </div>
              <Alert>
                <AlertDescription>
                  Share this password securely with the user. All sessions have been invalidated.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {actionType === 'delete' && (
            <div className="space-y-2">
              <Label htmlFor="confirmEmail">Type "{user.email}" to confirm</Label>
              <Input
                id="confirmEmail"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={user.email}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tempPassword ? 'Close' : 'Cancel'}
          </Button>
          {!tempPassword && (
            <Button
              variant={getButtonVariant()}
              onClick={
                actionType === 'suspend'
                  ? handleSuspend
                  : actionType === 'activate'
                    ? handleActivate
                    : actionType === 'reset-password'
                      ? handleResetPassword
                      : handleDelete
              }
              disabled={loading}
            >
              {loading ? 'Processing...' : getButtonText()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
