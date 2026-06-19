'use client';

import {
  useActionState,
  useOptimistic,
  useRef,
  useState,
  startTransition,
  type FormEvent,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileUpdateSchema, type ProfileUpdateInput, type ProfileResponse } from '@repo/shared';
import { updateProfileAction, type ProfileActionResult } from '@/actions/profile';
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';

interface ProfilePageProps {
  initialProfile: ProfileResponse;
}

export function ProfileForm({ initialProfile }: ProfilePageProps) {
  const [optimisticProfile, setOptimisticProfile] = useOptimistic(
    initialProfile,
    (state: ProfileResponse, update: Partial<ProfileResponse>) => ({
      ...state,
      ...update,
    }),
  );

  const [serverState, formAction, isPending] = useActionState<ProfileActionResult | null, FormData>(
    updateProfileAction,
    null,
  );

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: initialProfile.name ?? '',
      image: initialProfile.image ?? '',
    },
  });

  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    form.trigger().then((isValid) => {
      if (!isValid) return;

      const values = form.getValues();
      setSaveStatus('saving');

      setOptimisticProfile({
        name: values.name ?? optimisticProfile.name,
        image: values.image ?? optimisticProfile.image,
      });

      const formData = new FormData();
      if (values.name !== undefined) formData.set('name', values.name);
      if (values.image !== undefined) formData.set('image', values.image ?? '');

      startTransition(async () => {
        const result = await updateProfileAction(serverState, formData);

        if (result.success) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('error');
          if (result.errors) {
            for (const [field, messages] of Object.entries(result.errors)) {
              if (messages.length > 0) {
                form.setError(field as keyof ProfileUpdateInput, {
                  type: 'server',
                  message: messages[0],
                });
              }
            }
          }
        }
      });
    });
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Profile</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader title="Profile" description="Manage your account settings">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className={`inline-block size-2 rounded-full ${
              saveStatus === 'saving'
                ? 'bg-yellow-500 animate-pulse'
                : saveStatus === 'saved'
                  ? 'bg-green-500'
                  : saveStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-muted-foreground/30'
            }`}
          />
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'saved'
              ? 'Saved'
              : saveStatus === 'error'
                ? 'Error saving'
                : 'Up to date'}
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 font-semibold">Current Profile</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{' '}
              <span className="font-medium">{optimisticProfile.name ?? 'Not set'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>{' '}
              <span className="font-medium">{optimisticProfile.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Role:</span>{' '}
              <span className="font-medium">{optimisticProfile.role}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{' '}
              <span className="font-medium">{optimisticProfile.status}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 font-semibold">Update Profile</h3>
          <Form {...form}>
            <form
              ref={formRef}
              action={formAction}
              onSubmit={handleSubmit}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your name"
                        autoComplete="name"
                        disabled={isPending}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        disabled={isPending}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serverState?.success === false && serverState.message && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {serverState.message}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
