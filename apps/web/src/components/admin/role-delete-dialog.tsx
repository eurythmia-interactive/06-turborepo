'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { deleteRoleAction, getRolesAction } from '@/actions/roles';
import type { RoleResponse } from '@repo/shared';
import { AlertTriangle } from 'lucide-react';

interface RoleDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleResponse | null;
  onSuccess: () => void;
}

export function RoleDeleteDialog({ open, onOpenChange, role, onSuccess }: RoleDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [reassignTo, setReassignTo] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<RoleResponse[]>([]);

  useEffect(() => {
    if (open && role) {
      loadAvailableRoles();
    }
  }, [open, role]);

  const loadAvailableRoles = async () => {
    const result = await getRolesAction({ page: 1, limit: 100, includeSystem: false });
    if (result.success && result.data) {
      setAvailableRoles(result.data.data.filter((r) => r.id !== role?.id));
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setConfirmName('');
      setReassignTo('');
    }
    onOpenChange(newOpen);
  };

  const handleDelete = async () => {
    if (!role || confirmName !== role.name) return;

    setLoading(true);
    try {
      const result = await deleteRoleAction(role.id, reassignTo || undefined);

      if (result.success) {
        toast.success('Role deleted successfully');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to delete role');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!role) return null;

  const hasUsers = (role.userCount ?? 0) > 0;
  const canDelete = confirmName === role.name;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Role
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the role{' '}
            <strong>{role.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {role.isSystem && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>System roles cannot be deleted.</AlertDescription>
            </Alert>
          )}

          {hasUsers && (
            <Alert>
              <AlertDescription>
                This role has {role.userCount} user(s) assigned. You must reassign them to another
                role before deleting.
              </AlertDescription>
            </Alert>
          )}

          {hasUsers && (
            <div className="space-y-2">
              <Label>Reassign users to</Label>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Type <strong>{role.name}</strong> to confirm
            </Label>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={role.name}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !canDelete || role.isSystem || (hasUsers && !reassignTo)}
          >
            {loading ? 'Deleting...' : 'Delete Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
