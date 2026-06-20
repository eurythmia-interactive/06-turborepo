'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X, UserCircle } from 'lucide-react';
import {
  getImpersonationStatusAction,
  stopImpersonationAction,
  type ImpersonationStatus,
} from '@/actions/impersonation';
import { toast } from 'sonner';

export function ImpersonationBanner() {
  const [status, setStatus] = useState<ImpersonationStatus | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!status?.expiresAt) return;

    const updateTimer = () => {
      const expires = new Date(status.expiresAt!);
      const now = new Date();
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        handleStop();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [status?.expiresAt]);

  async function checkStatus() {
    const result = await getImpersonationStatusAction();
    if (result.success && result.data?.isImpersonating) {
      setStatus(result.data);
    } else {
      setStatus(null);
    }
  }

  async function handleStop() {
    setLoading(true);
    const result = await stopImpersonationAction();
    setLoading(false);

    if (result.success) {
      toast.success('Impersonation stopped');
      setStatus(null);
      router.push('/admin');
    } else {
      toast.error(result.message || 'Failed to stop impersonation');
    }
  }

  if (!status?.isImpersonating) return null;

  return (
    <div className="border-b border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
      <div className="container flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-200">
          <UserCircle className="size-4" />
          <span>
            <strong>Impersonating:</strong> {status.targetUser?.name || status.targetUser?.email}
          </span>
          {timeLeft && (
            <span className="text-xs text-orange-600 dark:text-orange-400">
              ({timeLeft} remaining)
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          disabled={loading}
          className="h-7 text-xs text-orange-800 hover:bg-orange-100 dark:text-orange-200 dark:hover:bg-orange-900"
        >
          <X className="mr-1 size-3" />
          {loading ? 'Stopping...' : 'Stop'}
        </Button>
      </div>
    </div>
  );
}
