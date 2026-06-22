'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Power, PowerOff, Plus, Trash2, Shield } from 'lucide-react';
import {
  getMaintenanceStatusAction,
  enableMaintenanceAction,
  disableMaintenanceAction,
  type MaintenanceStatus,
} from '@/actions/maintenance';
import {
  getIpAllowlistAction,
  addIpAllowlistAction,
  removeIpAllowlistAction,
  type IpEntry,
} from '@/actions/system';
import { toast } from 'sonner';

export function SettingsPanel() {
  return (
    <div className="space-y-8">
      <IpAllowlistSection />
      <MaintenanceSection />
    </div>
  );
}

function MaintenanceSection() {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');

  const fetchStatus = useCallback(async () => {
    const result = await getMaintenanceStatusAction();
    if (result.success && result.data) {
      setStatus(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleEnable() {
    setActionLoading(true);
    const result = await enableMaintenanceAction({
      message: message || undefined,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : undefined,
    });
    setActionLoading(false);

    if (result.success) {
      toast.success('Maintenance mode enabled');
      setDialogOpen(false);
      setMessage('');
      setScheduledEnd('');
      fetchStatus();
    } else {
      toast.error(result.message || 'Failed to enable maintenance mode');
    }
  }

  async function handleDisable() {
    setActionLoading(true);
    const result = await disableMaintenanceAction();
    setActionLoading(false);

    if (result.success) {
      toast.success('Maintenance mode disabled');
      fetchStatus();
    } else {
      toast.error(result.message || 'Failed to disable maintenance mode');
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Power className="size-5" />
            <CardTitle>Maintenance Mode</CardTitle>
          </div>
          <CardDescription>
            Toggle maintenance mode to block non-admin access during updates or downtime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={status?.enabled ? 'destructive' : 'outline'}>
              {status?.enabled ? 'Active' : 'Inactive'}
            </Badge>
            {status?.enabled && status.message && (
              <span className="text-sm text-muted-foreground">{status.message}</span>
            )}
          </div>

          {status?.enabled ? (
            <div>
              {status.scheduledEnd && (
                <p className="mb-3 text-sm text-muted-foreground">
                  Scheduled to end at {new Date(status.scheduledEnd).toLocaleString()}
                </p>
              )}
              <Button variant="outline" onClick={handleDisable} disabled={actionLoading}>
                <PowerOff className="mr-2 size-4" />
                {actionLoading ? 'Disabling...' : 'Disable Maintenance Mode'}
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Power className="mr-2 size-4" />
              Enable Maintenance Mode
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Maintenance Mode</DialogTitle>
            <DialogDescription>
              This will block all non-admin users from accessing the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="maint-message">Maintenance Message (optional)</Label>
              <Textarea
                id="maint-message"
                placeholder="We are performing scheduled maintenance. Please check back later."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
              />
            </div>

            <div>
              <Label htmlFor="maint-end">Scheduled End Time (optional)</Label>
              <Input
                id="maint-end"
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEnable} disabled={actionLoading}>
              {actionLoading ? 'Enabling...' : 'Enable Maintenance Mode'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function IpAllowlistSection() {
  const [entries, setEntries] = useState<IpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    const result = await getIpAllowlistAction();
    if (result.success && result.data) {
      setEntries(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleAdd() {
    if (!newIp.trim()) return;
    setActionLoading(true);
    const result = await addIpAllowlistAction(newIp.trim());
    setActionLoading(false);

    if (result.success) {
      toast.success(`IP ${newIp.trim()} added to allowlist`);
      setNewIp('');
      setAddOpen(false);
      fetchEntries();
    } else {
      toast.error(result.message || 'Failed to add IP');
    }
  }

  async function handleRemove(ip: string) {
    setActionLoading(true);
    const result = await removeIpAllowlistAction(ip);
    setActionLoading(false);

    if (result.success) {
      toast.success(`IP ${ip} removed from allowlist`);
      fetchEntries();
    } else {
      toast.error(result.message || 'Failed to remove IP');
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="size-5" />
              <div>
                <CardTitle>IP Allowlist</CardTitle>
                <CardDescription>
                  Restrict admin panel access to specific IP addresses. An empty list means all IPs
                  are allowed.
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add IP
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : entries.length === 0 ? (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>
                No IPs configured. All IP addresses can access the admin panel.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.ip}
                  className="flex items-center justify-between rounded-md border px-4 py-2"
                >
                  <div>
                    <code className="text-sm font-medium">{entry.ip}</code>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(entry.addedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(entry.ip)}
                    disabled={actionLoading}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add IP to Allowlist</DialogTitle>
            <DialogDescription>Enter an IP address to grant admin panel access.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="ip-address">IP Address</Label>
              <Input
                id="ip-address"
                placeholder="192.168.1.1"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={actionLoading || !newIp.trim()}>
              {actionLoading ? 'Adding...' : 'Add IP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
