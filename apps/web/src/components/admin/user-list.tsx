'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type RowSelectionState,
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
import { getUsersAction } from '@/actions/users';
import type { UserResponse, UserListQuery } from '@repo/shared';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateUserDialog } from './create-user-dialog';
import { UserActions } from './user-actions';
import { ImpersonateButton } from './impersonate-button';
import Link from 'next/link';

const columnHelper = createColumnHelper<UserResponse>();

export function UserList() {
  const [data, setData] = useState<UserResponse[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'PENDING'>('ALL');
  const [role, setRole] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [actionType, setActionType] = useState<
    'suspend' | 'activate' | 'reset-password' | 'delete' | null
  >(null);
  const [impersonateUser, setImpersonateUser] = useState<UserResponse | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const query: UserListQuery = {
      page: pagination.page,
      limit: pagination.limit,
      search: search || undefined,
      status: status === 'ALL' ? undefined : status,
      role: (role || undefined) as any,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const result = await getUsersAction(query);
    if (result.success && result.data) {
      setData(result.data.data);
      setPagination((prev) => ({
        ...prev,
        total: result.data!.pagination.total,
        totalPages: result.data!.pagination.totalPages,
      }));
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, search, status, role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const columns: ColumnDef<UserResponse, any>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="h-4 w-4"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4"
        />
      ),
    },
    columnHelper.accessor('email', {
      header: 'User',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            {info.row.original.name?.[0]?.toUpperCase() || info.getValue()[0].toUpperCase()}
          </div>
          <div>
            <Link
              href={`/admin/users/${info.row.original.id}`}
              className="font-medium hover:underline"
            >
              {info.row.original.name || 'N/A'}
            </Link>
            <p className="text-sm text-muted-foreground">{info.getValue()}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('tenants', {
      header: 'Tenants',
      cell: (info) => {
        const tenants = info.getValue() || [];
        if (tenants.length === 0) {
          return <span className="text-muted-foreground">None</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {tenants.slice(0, 2).map((t: any) => (
              <Badge key={t.tenantId} variant="outline" className="text-xs">
                {t.role}
              </Badge>
            ))}
            {tenants.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{tenants.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('role', {
      header: 'Role',
      cell: (info) => (
        <Badge variant="outline" className="capitalize">
          {info.getValue().toLowerCase().replace('_', ' ')}
        </Badge>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const status = info.getValue();
        const variant =
          status === 'ACTIVE' ? 'default' : status === 'SUSPENDED' ? 'destructive' : 'secondary';
        return <Badge variant={variant}>{status}</Badge>;
      },
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: (info) => new Date(info.getValue()).toLocaleDateString(),
    }),
    columnHelper.accessor('lastLoginAt', {
      header: 'Last Login',
      cell: (info) => {
        const lastLogin = info.getValue();
        return lastLogin ? new Date(lastLogin).toLocaleDateString() : 'Never';
      },
    }),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original;
        if (user.isSystem) {
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
                <Link href={`/admin/users/${user.id}`}>View Details</Link>
              </DropdownMenuItem>
              {user.status !== 'SUSPENDED' && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedUser(user);
                    setActionType('suspend');
                  }}
                >
                  Suspend
                </DropdownMenuItem>
              )}
              {user.status === 'SUSPENDED' && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedUser(user);
                    setActionType('activate');
                  }}
                >
                  Activate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(user);
                  setActionType('reset-password');
                }}
              >
                Reset Password
              </DropdownMenuItem>
              {user.role !== 'SUPER_ADMIN' && (
                <DropdownMenuItem onClick={() => setImpersonateUser(user)}>
                  Impersonate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setSelectedUser(user);
                  setActionType('delete');
                }}
              >
                Delete
              </DropdownMenuItem>
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
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
  });

  const selectedCount = Object.keys(rowSelection).length;

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
            placeholder="Search users..."
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
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Roles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MEMBER">Member</SelectItem>
            <SelectItem value="GUEST">Guest</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border p-3 bg-muted/50">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <Button size="sm" variant="outline">
            Suspend
          </Button>
          <Button size="sm" variant="outline">
            Activate
          </Button>
          <Button size="sm" variant="outline">
            Delete
          </Button>
          <Button size="sm" variant="outline">
            Assign Role
          </Button>
        </div>
      )}

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
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
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
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {data.length} of {pagination.total} users
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

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchUsers}
      />

      {selectedUser && actionType && (
        <UserActions
          user={selectedUser}
          actionType={actionType}
          onClose={() => {
            setSelectedUser(null);
            setActionType(null);
          }}
          onSuccess={fetchUsers}
        />
      )}

      {impersonateUser && (
        <ImpersonateButton user={impersonateUser} onClose={() => setImpersonateUser(null)} />
      )}
    </div>
  );
}
