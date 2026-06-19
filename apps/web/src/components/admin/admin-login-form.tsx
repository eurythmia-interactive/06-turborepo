'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput, type LoginResponse } from '@repo/shared';
import { Shield } from 'lucide-react';
import type { AuthActionResult } from '@/actions/auth';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AdminLoginFormProps {
  state: AuthActionResult<LoginResponse> | null;
  formAction: (formData: FormData) => void;
  isPending: boolean;
}

export function AdminLoginForm({ state, formAction, isPending }: AdminLoginFormProps) {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (state?.success === false && state.errors) {
      for (const [field, messages] of Object.entries(state.errors)) {
        if (messages.length > 0) {
          form.setError(field as keyof LoginInput, {
            type: 'server',
            message: messages[0],
          });
        }
      }
    }
  }, [state, form]);

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-6" noValidate>
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="size-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Admin Portal</h2>
          <p className="text-sm text-muted-foreground">Sign in with admin credentials</p>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    autoComplete="username"
                    disabled={isPending}
                    aria-invalid={!!form.formState.errors.email}
                    aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
                    {...field}
                  />
                </FormControl>
                <FormMessage id="email-error" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isPending}
                    aria-invalid={!!form.formState.errors.password}
                    aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
                    {...field}
                  />
                </FormControl>
                <FormMessage id="password-error" />
              </FormItem>
            )}
          />
        </div>

        {state?.success === false && state.message && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {state.message}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Signing in...' : 'Sign in as Admin'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Authorized personnel only. All access is monitored and logged.
        </p>
      </form>
    </Form>
  );
}
