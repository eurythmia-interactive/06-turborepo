'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import type { AuditLogDetailResponse } from '@repo/shared';
import { toast } from 'sonner';

interface AuditLogDetailDialogProps {
  log: AuditLogDetailResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getActionCategory(action: string): string {
  if (action.startsWith('auth.') || action.startsWith('admin.')) return 'auth';
  if (action.startsWith('user.')) return 'user';
  if (action.startsWith('tenant.')) return 'tenant';
  if (action.startsWith('role.')) return 'role';
  if (action.startsWith('session.')) return 'session';
  if (action.startsWith('system.')) return 'system';
  if (action.startsWith('security.')) return 'security';
  return 'other';
}

function getCategoryBadgeVariant(category: string) {
  switch (category) {
    case 'auth':
      return 'default';
    case 'user':
      return 'secondary';
    case 'tenant':
      return 'outline';
    case 'role':
      return 'default';
    case 'session':
      return 'secondary';
    case 'system':
      return 'outline';
    case 'security':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatAction(action: string): string {
  return action
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function AuditLogDetailDialog({ log, open, onOpenChange }: AuditLogDetailDialogProps) {
  if (!log) return null;

  const category = getActionCategory(log.action);
  const createdAt = new Date(log.createdAt);

  const handleCopyDetails = () => {
    const details = JSON.stringify(log.details, null, 2);
    navigator.clipboard.writeText(details);
    toast.success('Details copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Action</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-medium">{formatAction(log.action)}</span>
                <Badge variant={getCategoryBadgeVariant(category)} className="text-xs">
                  {category}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
              <div className="mt-1">
                <p className="font-medium">{createdAt.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{log.timeAgo}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">User</p>
              <div className="mt-1">
                <p className="font-medium">{log.user?.name ?? 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">{log.user?.email}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tenant</p>
              <div className="mt-1">
                {log.tenant ? (
                  <>
                    <p className="font-medium">{log.tenant.name}</p>
                    <p className="text-sm text-muted-foreground">{log.tenant.slug}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">—</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">IP Address</p>
              <p className="mt-1 font-mono text-sm">{log.ip ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">User Agent</p>
              <p className="mt-1 truncate text-sm" title={log.userAgent ?? ''}>
                {log.userAgent ?? '—'}
              </p>
            </div>
          </div>

          {log.details && Object.keys(log.details).length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Details</p>
                <Button variant="ghost" size="sm" onClick={handleCopyDetails}>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </Button>
              </div>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-4 text-sm">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
