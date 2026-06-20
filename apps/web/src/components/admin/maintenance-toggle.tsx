'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Power, PowerOff, AlertTriangle } from 'lucide-react';
import {
  getMaintenanceStatusAction,
  enableMaintenanceAction,
  disableMaintenanceAction,
  type MaintenanceStatus,
} from '@/actions/maintenance';
import { toast } from 'sonner';

export function MaintenanceToggle() {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    const result = await getMaintenanceStatusAction();
    if (result.success && result.data) {
      setStatus(result.data);
    }
  }

  async function handleEnable() {
    setLoading(true);
    const result = await enableMaintenanceAction({
      message: message || undefined,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : undefined,
    });
    setLoading(false);

    if (result.success) {
      toast.success('Maintenance mode enabled');
      setDialogOpen(false);
      setMessage('');
      setScheduledEnd('');
      await fetchStatus();
    } else {
      toast.error(result.message || 'Failed to enable maintenance mode');
    }
  }

  async function handleDisable() {
    setLoading(true);
    const result = await disableMaintenanceAction();
    setLoading(false);

    if (result.success) {
      toast.success('Maintenance mode disabled');
      await fetchStatus();
    } else {
      toast.error(result.message || 'Failed to disable maintenance mode');
    }
  }

  if (!status) return null;

  if (status.enabled) {
    return (
      <>
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <div className="flex items-center justify-between">
              <span>
                <strong>Maintenance mode is active.</strong>{' '}
                {status.message && `${status.message} `}
                {status.scheduledEnd &&
                  `Expected to end at ${new Date(status.scheduledEnd).toLocaleString()}.`}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisable}
                disabled={loading}
                className="ml-4"
              >
                <PowerOff className="mr-2 size-4" />
                {loading ? 'Disabling...' : 'Disable'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        <Power className="mr-2 size-4" />
        Enable Maintenance
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Maintenance Mode</DialogTitle>
            <DialogDescription>
              This will block all non-admin users from accessing the system. Admin users will still
              be able to access the admin dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Maintenance Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="We are performing scheduled maintenance. Please check back later."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                This message will be shown to users when they try to access the system.
              </p>
            </div>

            <div>
              <Label htmlFor="scheduledEnd">Scheduled End Time (optional)</Label>
              <Input
                id="scheduledEnd"
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                If set, users will see when maintenance is expected to end.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEnable} disabled={loading}>
              {loading ? 'Enabling...' : 'Enable Maintenance Mode'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
