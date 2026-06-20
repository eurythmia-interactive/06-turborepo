'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateRoleSchema, type UpdateRoleInput, type RoleDetailResponse } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { updateRoleAction } from '@/actions/roles';
import { PermissionMatrix } from './permission-matrix';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface RoleEditProps {
  role: RoleDetailResponse;
}

export function RoleEdit({ role }: RoleEditProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role.permissions);
  const [hasChanges, setHasChanges] = useState(false);

  const form = useForm<UpdateRoleInput>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      name: role.name,
      description: role.description || '',
      permissions: role.permissions,
    },
  });

  const onSubmit = async (data: UpdateRoleInput) => {
    setLoading(true);
    try {
      const result = await updateRoleAction(role.id, {
        ...data,
        permissions: selectedPermissions,
      });

      if (result.success) {
        toast.success('Role updated successfully');
        setHasChanges(false);
      } else {
        toast.error(result.message || 'Failed to update role');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permissions: string[]) => {
    setSelectedPermissions(permissions);
    form.setValue('permissions', permissions as UpdateRoleInput['permissions']);
    setHasChanges(true);
  };

  const handleFormChange = () => {
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/roles">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roles
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{role.name}</h1>
          {role.isSystem && <Badge variant="outline">System Role</Badge>}
        </div>
        {hasChanges && <Badge variant="secondary">Unsaved changes</Badge>}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={role.isSystem}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFormChange();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the role's purpose"
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFormChange();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <FormLabel>Permissions</FormLabel>
            <PermissionMatrix
              selectedPermissions={selectedPermissions}
              onChange={handlePermissionChange}
              readOnly={role.isSystem}
            />
            {form.formState.errors.permissions && (
              <p className="text-sm text-destructive">
                {form.formState.errors.permissions.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Link href="/admin/roles">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || !hasChanges || role.isSystem}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
