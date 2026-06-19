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
import { suspendTenantAction, restoreTenantAction, deleteTenantAction } from '@/actions/tenants';
import type { TenantResponse } from '@repo/shared';
import { toast } from 'sonner';

interface TenantActionsProps {
  tenant: TenantResponse;
  actionType: 'suspend' | 'restore' | 'delete';
  onClose: () => void;
  onSuccess: () => void;
}

export function TenantActions({ tenant, actionType, onClose, onSuccess }: TenantActionsProps) {
  const [reason, setReason] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = true;

  const handleSuspend = async () => {
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await suspendTenantAction(tenant.id, { reason });

    if (result.success) {
      toast.success('Tenant suspended successfully');
      onSuccess();
      onClose();
    } else {
      setError(result.message || 'Failed to suspend tenant');
    }

    setLoading(false);
  };

  const handleRestore = async () => {
    setLoading(true);
    setError(null);

    const result = await restoreTenantAction(tenant.id);

    if (result.success) {
      toast.success('Tenant restored successfully');
      onSuccess();
      onClose();
    } else {
      setError(result.message || 'Failed to restore tenant');
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (confirmName !== tenant.name) {
      setError('Tenant name does not match');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await deleteTenantAction(tenant.id);

    if (result.success) {
      toast.success('Tenant deleted successfully');
      onSuccess();
      onClose();
    } else {
      setError(result.message || 'Failed to delete tenant');
    }

    setLoading(false);
  };

  const getTitle = () => {
    switch (actionType) {
      case 'suspend':
        return 'Suspend Tenant';
      case 'restore':
        return 'Restore Tenant';
      case 'delete':
        return 'Delete Tenant';
    }
  };

  const getDescription = () => {
    switch (actionType) {
      case 'suspend':
        return `Suspend "${tenant.name}"? All users will be suspended and sessions invalidated.`;
      case 'restore':
        return `Restore "${tenant.name}"? Users will be reactivated but sessions will not be restored.`;
      case 'delete':
        return `Delete "${tenant.name}"? This action cannot be undone.`;
    }
  };

  const getButtonVariant = () => {
    switch (actionType) {
      case 'suspend':
        return 'default';
      case 'restore':
        return 'default';
      case 'delete':
        return 'destructive';
    }
  };

  const getButtonText = () => {
    switch (actionType) {
      case 'suspend':
        return 'Suspend Tenant';
      case 'restore':
        return 'Restore Tenant';
      case 'delete':
        return 'Delete Tenant';
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

          {actionType === 'delete' && (
            <div className="space-y-2">
              <Label htmlFor="confirmName">Type "{tenant.name}" to confirm</Label>
              <Input
                id="confirmName"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={tenant.name}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={getButtonVariant()}
            onClick={
              actionType === 'suspend'
                ? handleSuspend
                : actionType === 'restore'
                  ? handleRestore
                  : handleDelete
            }
            disabled={loading}
          >
            {loading ? 'Processing...' : getButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
