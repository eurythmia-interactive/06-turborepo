'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Mail } from 'lucide-react';
import {
  getInvitationsAction,
  resendInvitationAction,
  cancelInvitationAction,
} from '@/actions/invitations';
import type { InvitationResponse } from '@repo/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export function InvitationList() {
  const [data, setData] = useState<InvitationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    const query = statusFilter === 'ALL' ? undefined : { status: statusFilter as any };
    const result = await getInvitationsAction(query);
    if (result.success && result.data) {
      setData(result.data);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  async function handleResend(id: string) {
    const result = await resendInvitationAction(id);
    if (result.success) {
      toast.success('Invitation resent');
    } else {
      toast.error(result.message || 'Failed to resend invitation');
    }
  }

  async function handleCancel(id: string) {
    const result = await cancelInvitationAction(id);
    if (result.success) {
      toast.success('Invitation canceled');
      fetchInvitations();
    } else {
      toast.error(result.message || 'Failed to cancel invitation');
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      accepted: 'default',
      expired: 'outline',
      canceled: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by status:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length ? (
              data.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {invitation.role.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                  <TableCell>{new Date(invitation.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(invitation.expiresAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {invitation.status === 'pending' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleResend(invitation.id)}>
                            Resend
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleCancel(invitation.id)}
                          >
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No invitations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
