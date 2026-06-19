'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createTenantAction } from '@/actions/tenants';
import { PLAN_VALUES } from '@repo/shared';
import { toast } from 'sonner';

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTenantDialog({ open, onOpenChange, onSuccess }: CreateTenantDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const result = await createTenantAction({
      name,
      slug,
      adminEmail: adminEmail || undefined,
      plan: plan as any,
    });

    if (result.success) {
      toast.success('Tenant created successfully');
      if (result.data?.tempPassword) {
        toast.info(`Admin password: ${result.data.tempPassword}`, {
          duration: 10000,
        });
      }
      onSuccess();
      onOpenChange(false);
      setName('');
      setSlug('');
      setAdminEmail('');
      setPlan('free');
    } else {
      if (result.errors) {
        setFieldErrors(result.errors);
      }
      setError(result.message || 'Failed to create tenant');
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>Create a new tenant with optional admin user.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme Corporation"
                required
              />
              {fieldErrors.name && (
                <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="acme-corp"
                required
              />
              {fieldErrors.slug && (
                <p className="text-sm text-destructive">{fieldErrors.slug[0]}</p>
              )}
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier (lowercase, hyphens only)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email (optional)</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
              />
              {fieldErrors.adminEmail && (
                <p className="text-sm text-destructive">{fieldErrors.adminEmail[0]}</p>
              )}
              <p className="text-xs text-muted-foreground">
                If provided, creates an admin user for this tenant
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger id="plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_VALUES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
