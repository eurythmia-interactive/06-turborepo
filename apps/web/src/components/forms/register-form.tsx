'use client';

import { useActionState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@repo/shared';
import Link from 'next/link';
import { registerAction, type AuthActionResult } from '@/actions/register';
import type { RegisterResponse } from '@repo/shared';
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

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState<
    AuthActionResult<RegisterResponse> | null,
    FormData
  >(registerAction, null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (state?.success === false && state.errors) {
      for (const [field, messages] of Object.entries(state.errors)) {
        if (messages.length > 0) {
          form.setError(field as keyof RegisterInput, {
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
                    placeholder="you@example.com"
                    autoComplete="email"
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Your name"
                    autoComplete="name"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
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
                    placeholder="Create a password"
                    autoComplete="new-password"
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

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    disabled={isPending}
                    aria-invalid={!!form.formState.errors.confirmPassword}
                    aria-describedby={
                      form.formState.errors.confirmPassword ? 'confirm-password-error' : undefined
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage id="confirm-password-error" />
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
          {isPending ? 'Creating account...' : 'Create Account'}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/login" className="text-primary underline underline-offset-4">
            Sign in
          </Link>
        </div>
      </form>
    </Form>
  );
}
