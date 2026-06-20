'use client';

import * as React from 'react';
import { Permissions, AllPermissions, type Permission } from '@repo/shared';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PermissionCategory {
  name: string;
  permissions: Permission[];
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: 'Tenant Management',
    permissions: [
      Permissions.TENANT_READ,
      Permissions.TENANT_WRITE,
      Permissions.TENANT_DELETE,
      Permissions.TENANT_SUSPEND,
    ],
  },
  {
    name: 'User Management',
    permissions: [
      Permissions.USER_READ,
      Permissions.USER_WRITE,
      Permissions.USER_DELETE,
      Permissions.USER_SUSPEND,
      Permissions.USER_RESET_PASSWORD,
      Permissions.USER_IMPERSONATE,
    ],
  },
  {
    name: 'Role Management',
    permissions: [Permissions.ROLE_READ, Permissions.ROLE_WRITE, Permissions.ROLE_DELETE],
  },
  {
    name: 'Admin Management',
    permissions: [
      Permissions.ADMIN_ACCESS,
      Permissions.ADMIN_SETTINGS,
      Permissions.ADMIN_FEATURE_FLAGS,
      Permissions.ADMIN_AUDIT,
      Permissions.ADMIN_API_KEYS,
    ],
  },
  {
    name: 'System Management',
    permissions: [
      Permissions.SYSTEM_MAINTENANCE,
      Permissions.SYSTEM_BACKUP,
      Permissions.SYSTEM_CONFIG,
    ],
  },
];

interface PermissionMatrixProps {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  readOnly?: boolean;
  className?: string;
}

export function PermissionMatrix({
  selectedPermissions,
  onChange,
  readOnly = false,
  className,
}: PermissionMatrixProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handlePermissionToggle = (permission: string) => {
    if (readOnly) return;

    const newPermissions = selectedPermissions.includes(permission)
      ? selectedPermissions.filter((p) => p !== permission)
      : [...selectedPermissions, permission];

    onChange(newPermissions);
  };

  const handleCategoryToggle = (category: PermissionCategory) => {
    if (readOnly) return;

    const allSelected = category.permissions.every((p) => selectedPermissions.includes(p));

    if (allSelected) {
      onChange(selectedPermissions.filter((p) => !category.permissions.includes(p as Permission)));
    } else {
      const newPermissions = [...new Set([...selectedPermissions, ...category.permissions])];
      onChange(newPermissions);
    }
  };

  const handleSelectAll = () => {
    if (readOnly) return;
    onChange([...AllPermissions]);
  };

  const handleDeselectAll = () => {
    if (readOnly) return;
    onChange([]);
  };

  const filteredCategories = PERMISSION_CATEGORIES.map((category) => ({
    ...category,
    permissions: category.permissions.filter((p) =>
      p.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  })).filter((category) => category.permissions.length > 0);

  const totalSelected = selectedPermissions.length;
  const totalAvailable = AllPermissions.length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {totalSelected} of {totalAvailable} selected
          </Badge>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>
        )}
      </div>

      <Input
        placeholder="Search permissions..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4"
      />

      <div className="space-y-4">
        {filteredCategories.map((category) => {
          const allSelected = category.permissions.every((p) => selectedPermissions.includes(p));
          const someSelected =
            category.permissions.some((p) => selectedPermissions.includes(p)) && !allSelected;

          return (
            <Card key={category.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
                  {!readOnly && (
                    <Checkbox
                      checked={allSelected}
                      ref={undefined}
                      onChange={() => handleCategoryToggle(category)}
                      aria-label={`Toggle all ${category.name} permissions`}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {category.permissions.map((permission) => (
                  <div key={permission} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedPermissions.includes(permission)}
                      ref={undefined}
                      onChange={() => handlePermissionToggle(permission)}
                      disabled={readOnly}
                      label={permission}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No permissions found matching &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
}
