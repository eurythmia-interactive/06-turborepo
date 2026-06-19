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
import { getTenantsAction } from '@/actions/tenants';
import type { TenantResponse, TenantListQuery } from '@repo/shared';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateTenantDialog } from './create-tenant-dialog';
import { TenantActions } from './tenant-actions';
import Link from 'next/link';

const columnHelper = createColumnHelper<TenantResponse>();

export function TenantList() {
  const [data, setData] = useState<TenantResponse[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'suspended' | 'deleted'>('active');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantResponse | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'restore' | 'delete' | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    const query: TenantListQuery = {
      page: pagination.page,
      limit: pagination.limit,
      search: search || undefined,
      status,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const result = await getTenantsAction(query);
    if (result.success && result.data) {
      setData(result.data.data);
      setPagination((prev) => ({
        ...prev,
        total: result.data!.pagination.total,
        totalPages: result.data!.pagination.totalPages,
      }));
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, search, status]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const columns: ColumnDef<TenantResponse, any>[] = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: (info) => (
        <Link
          href={`/admin/tenants/${info.row.original.id}`}
          className="font-medium hover:underline"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('slug', {
      header: 'Slug',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor('suspended', {
      header: 'Status',
      cell: (info) => {
        const tenant = info.row.original;
        if (tenant.deletedAt) {
          return <Badge variant="destructive">Deleted</Badge>;
        }
        if (tenant.suspended) {
          return <Badge variant="secondary">Suspended</Badge>;
        }
        return <Badge variant="default">Active</Badge>;
      },
    }),
    columnHelper.accessor('_count.users', {
      header: 'Users',
      cell: (info) => info.getValue() || 0,
    }),
    columnHelper.accessor('plan', {
      header: 'Plan',
      cell: (info) => (
        <Badge variant="outline" className="capitalize">
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: (info) => new Date(info.getValue()).toLocaleDateString(),
    }),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const tenant = row.original;
        if (tenant.isSystem) {
          return <span className="text-sm text-muted-foreground">System</span>;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/tenants/${tenant.id}`}>View Details</Link>
              </DropdownMenuItem>
              {!tenant.suspended && !tenant.deletedAt && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setActionType('suspend');
                  }}
                >
                  Suspend
                </DropdownMenuItem>
              )}
              {tenant.suspended && !tenant.deletedAt && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setActionType('restore');
                  }}
                >
                  Restore
                </DropdownMenuItem>
              )}
              {!tenant.deletedAt && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setActionType('delete');
                  }}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
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
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value: any) => {
            setStatus(value);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  No tenants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {data.length} of {pagination.total} tenants
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <div className="text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <CreateTenantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchTenants}
      />

      {selectedTenant && actionType && (
        <TenantActions
          tenant={selectedTenant}
          actionType={actionType}
          onClose={() => {
            setSelectedTenant(null);
            setActionType(null);
          }}
          onSuccess={fetchTenants}
        />
      )}
    </div>
  );
}
