'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function SessionTimeoutWarning() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    const checkSession = () => {
      const cookies = document.cookie.split(';');
      const accessTokenCookie = cookies.find((c) => c.trim().startsWith('access_token='));

      if (!accessTokenCookie) {
        router.push('/admin/login');
        return;
      }

      const expiresMatch = accessTokenCookie.match(/expires=([^;]+)/);
      if (expiresMatch && expiresMatch[1]) {
        const expires = new Date(expiresMatch[1]).getTime();
        const now = Date.now();
        const remaining = Math.floor((expires - now) / 1000);

        if (remaining <= 300 && remaining > 0) {
          setShowWarning(true);
          setTimeLeft(remaining);
        } else if (remaining <= 0) {
          router.push('/admin/login');
        }
      }
    };

    const interval = setInterval(checkSession, 60000);
    checkSession();

    return () => clearInterval(interval);
  }, [router]);

  const extendSession = () => {
    router.refresh();
    setShowWarning(false);
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="text-xl font-semibold">Session Expiring Soon</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Your session will expire in {Math.floor(timeLeft / 60)} minutes and {timeLeft % 60}{' '}
          seconds.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={extendSession}>Extend Session</Button>
          <Button variant="outline" onClick={() => router.push('/admin/login')}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
