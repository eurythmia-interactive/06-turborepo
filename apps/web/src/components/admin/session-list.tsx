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
import { Skeleton } from '@/components/ui/skeleton';
import { Monitor, Smartphone, Tablet, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSessionsAction, getSessionSummaryAction } from '@/actions/sessions';
import type { SessionResponse, SessionListQuery } from '@repo/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SessionRevokeDialog } from './session-revoke-dialog';

const columnHelper = createColumnHelper<SessionResponse>();

function getDeviceIcon(type: string) {
  switch (type) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'expired':
      return 'secondary';
    case 'revoked':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function SessionList() {
  const [data, setData] = useState<SessionResponse[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [summary, setSummary] = useState({ totalActive: 0, totalExpired: 0, totalRevoked: 0 });
  const [selectedSession, setSelectedSession] = useState<SessionResponse | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const query: SessionListQuery = {
      page: pagination.page,
      limit: pagination.limit,
      status: (statusFilter as any) || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const [sessionsResult, summaryResult] = await Promise.all([
      getSessionsAction(query),
      getSessionSummaryAction(),
    ]);

    if (sessionsResult.success && sessionsResult.data) {
      setData(sessionsResult.data.data);
      setPagination((prev) => ({
        ...prev,
        total: sessionsResult.data!.meta.total,
        totalPages: sessionsResult.data!.meta.totalPages,
      }));
    }

    if (summaryResult.success && summaryResult.data) {
      setSummary(summaryResult.data);
    }

    setLoading(false);
  }, [pagination.page, pagination.limit, statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const columns: ColumnDef<SessionResponse, any>[] = [
    columnHelper.accessor('user', {
      header: 'User',
      cell: (info) => {
        const user = info.getValue();
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name ?? 'Unknown'}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor('device', {
      header: 'Device',
      cell: (info) => {
        const device = info.getValue();
        return (
          <div className="flex items-center gap-2">
            {getDeviceIcon(device.type)}
            <div className="flex flex-col">
              <span className="text-sm">{device.browser}</span>
              <span className="text-xs text-muted-foreground">{device.os}</span>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('ip', {
      header: 'IP Address',
      cell: (info) => <span className="font-mono text-xs">{info.getValue() ?? '—'}</span>,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: (info) => (
        <div className="flex flex-col">
          <span className="text-sm">{new Date(info.getValue()).toLocaleDateString()}</span>
          <span className="text-xs text-muted-foreground">{formatTimeAgo(info.getValue())}</span>
        </div>
      ),
    }),
    columnHelper.accessor('expiresAt', {
      header: 'Expires',
      cell: (info) => (
        <div className="flex flex-col">
          <span className="text-sm">{new Date(info.getValue()).toLocaleDateString()}</span>
          <span className="text-xs text-muted-foreground">{formatTimeAgo(info.getValue())}</span>
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => (
        <Badge variant={getStatusBadgeVariant(info.getValue())}>{info.getValue()}</Badge>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => {
        const session = row.original;
        if (session.status === 'revoked') {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedSession(session);
              setRevokeOpen(true);
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Revoke
          </Button>
        );
      },
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading && data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Active Sessions</p>
          <p className="text-2xl font-bold">{summary.totalActive}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Expired Sessions</p>
          <p className="text-2xl font-bold">{summary.totalExpired}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Revoked Sessions</p>
          <p className="text-2xl font-bold">{summary.totalRevoked}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
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
                  No sessions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {data.length} of {pagination.total} sessions
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <SessionRevokeDialog
        session={selectedSession}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onRevoked={fetchSessions}
      />
    </div>
  );
}
