'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { getRolesAction } from '@/actions/roles';
import type { RoleResponse, RoleListQuery } from '@repo/shared';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateRoleDialog } from './create-role-dialog';
import { RoleDeleteDialog } from './role-delete-dialog';
import Link from 'next/link';

const columnHelper = createColumnHelper<RoleResponse>();

export function RoleList() {
  const [data, setData] = useState<RoleResponse[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeSystem, setIncludeSystem] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleResponse | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const query: RoleListQuery = {
      page: pagination.page,
      limit: pagination.limit,
      search: search || undefined,
      includeSystem,
    };

    const result = await getRolesAction(query);
    if (result.success && result.data) {
      setData(result.data.data);
      setPagination((prev) => ({
        ...prev,
        total: result.data!.meta.total,
        totalPages: result.data!.meta.totalPages,
      }));
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, search, includeSystem]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const columns: ColumnDef<RoleResponse, any>[] = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/roles/${info.row.original.id}/edit`}
            className="font-medium hover:underline"
          >
            {info.getValue()}
          </Link>
          {info.row.original.isSystem && (
            <Badge variant="outline" className="text-xs">
              System
            </Badge>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: (info) => (
        <span className="text-muted-foreground truncate max-w-xs">{info.getValue() || '—'}</span>
      ),
    }),
    columnHelper.accessor('permissions', {
      header: 'Permissions',
      cell: (info) => <Badge variant="secondary">{info.getValue().length} permissions</Badge>,
    }),
    columnHelper.accessor('userCount', {
      header: 'Users',
      cell: (info) => <span>{info.getValue() ?? 0}</span>,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: (info) => (
        <span className="text-muted-foreground">
          {new Date(info.getValue()).toLocaleDateString()}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      cell: (info) => {
        const role = info.row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/roles/${role.id}/edit`}>Edit</Link>
              </DropdownMenuItem>
              {!role.isSystem && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setSelectedRole(role);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={includeSystem}
              onChange={(e) => setIncludeSystem(e.target.checked)}
              id="include-system"
            />
            <label htmlFor="include-system" className="text-sm cursor-pointer">
              Include system roles
            </label>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.original.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No roles found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <CreateRoleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchRoles}
      />

      <RoleDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        role={selectedRole}
        onSuccess={fetchRoles}
      />
    </div>
  );
}
