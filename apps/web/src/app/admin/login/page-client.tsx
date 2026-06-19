'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction, type AuthActionResult } from '@/actions/auth';
import type { LoginResponse } from '@repo/shared';
import { AdminLoginForm } from '@/components/admin/admin-login-form';

export function AdminLoginPageClient() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    AuthActionResult<LoginResponse> | null,
    FormData
  >(loginAction, null);

  useEffect(() => {
    if (state?.success) {
      const role = state.data?.user.role;
      if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [state, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Admin Portal</h1>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <AdminLoginForm state={state} formAction={formAction} isPending={isPending} />
        </div>
      </div>
    </div>
  );
}
