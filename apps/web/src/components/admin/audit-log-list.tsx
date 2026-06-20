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
import { Search, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAuditLogsAction } from '@/actions/audit';
import type { AuditLogResponse, AuditLogQuery } from '@repo/shared';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuditLogDetailDialog } from './audit-log-detail-dialog';
import { AuditExportDialog } from './audit-export-dialog';

const columnHelper = createColumnHelper<AuditLogResponse>();

const ACTION_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'auth', label: 'Authentication' },
  { value: 'user', label: 'User Management' },
  { value: 'tenant', label: 'Tenant Management' },
  { value: 'role', label: 'Role Management' },
  { value: 'session', label: 'Session Management' },
  { value: 'system', label: 'System' },
  { value: 'security', label: 'Security' },
];

function getActionCategory(action: string): string {
  if (action.startsWith('auth.') || action.startsWith('admin.')) return 'auth';
  if (action.startsWith('user.')) return 'user';
  if (action.startsWith('tenant.')) return 'tenant';
  if (action.startsWith('role.')) return 'role';
  if (action.startsWith('session.')) return 'session';
  if (action.startsWith('system.')) return 'system';
  if (action.startsWith('security.')) return 'security';
  return 'other';
}

function getCategoryBadgeVariant(category: string) {
  switch (category) {
    case 'auth':
      return 'default';
    case 'user':
      return 'secondary';
    case 'tenant':
      return 'outline';
    case 'role':
      return 'default';
    case 'session':
      return 'secondary';
    case 'system':
      return 'outline';
    case 'security':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatAction(action: string): string {
  return action
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

export function AuditLogList() {
  const [data, setData] = useState<AuditLogResponse[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionCategory, setActionCategory] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const query: AuditLogQuery = {
      page: pagination.page,
      limit: pagination.limit,
      search: search || undefined,
      actionCategory: actionCategory || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const result = await getAuditLogsAction(query);
    if (result.success && result.data) {
      setData(result.data.data);
      setPagination((prev) => ({
        ...prev,
        total: result.data!.meta.total,
        totalPages: result.data!.meta.totalPages,
      }));
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, search, actionCategory]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: ColumnDef<AuditLogResponse, any>[] = [
    columnHelper.accessor('createdAt', {
      header: 'Timestamp',
      cell: (info) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(info.getValue()).toLocaleTimeString()}
          </span>
          <span className="text-xs text-muted-foreground">{formatTimeAgo(info.getValue())}</span>
        </div>
      ),
    }),
    columnHelper.accessor('user', {
      header: 'User',
      cell: (info) => {
        const user = info.getValue();
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.name ?? 'Unknown'}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor('action', {
      header: 'Action',
      cell: (info) => {
        const action = info.getValue();
        const category = getActionCategory(action);
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{formatAction(action)}</span>
            <Badge variant={getCategoryBadgeVariant(category)} className="w-fit text-xs">
              {category}
            </Badge>
          </div>
        );
      },
    }),
    columnHelper.accessor('tenant', {
      header: 'Tenant',
      cell: (info) => {
        const tenant = info.getValue();
        return tenant ? (
          <span className="text-sm">{tenant.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.accessor('ip', {
      header: 'IP',
      cell: (info) => <span className="text-sm font-mono text-xs">{info.getValue() ?? '—'}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedLog(row.original);
            setDetailOpen(true);
          }}
        >
          <Eye className="mr-1 h-4 w-4" />
          View
        </Button>
      ),
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
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={actionCategory}
            onValueChange={(value) => {
              setActionCategory(value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => setExportOpen(true)}>
          <Download className="mr-2 h-4 w-4" />
          Export
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
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {data.length} of {pagination.total} logs
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

      <AuditLogDetailDialog log={selectedLog} open={detailOpen} onOpenChange={setDetailOpen} />

      <AuditExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        filters={{
          search: search || undefined,
          actionCategory: actionCategory || undefined,
        }}
      />
    </div>
  );
}
