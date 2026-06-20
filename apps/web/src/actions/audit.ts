'use server';

import { serverApiClient } from '@/lib/server-api-client';
import {
  auditLogQuerySchema,
  auditSummaryQuerySchema,
  auditExportQuerySchema,
  type AuditLogQuery,
  type AuditLogResponse,
  type AuditLogDetailResponse,
  type AuditSummaryQuery,
  type AuditSummaryResponse,
  type AuditExportQuery,
} from '@repo/shared';

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function getAuditLogsAction(params: AuditLogQuery): Promise<
  ActionResult<{
    data: AuditLogResponse[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>
> {
  try {
    const validated = auditLogQuerySchema.parse(params);
    const searchParams = new URLSearchParams();
    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const result = await serverApiClient.get<{
      data: AuditLogResponse[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/v1/admin/audit/logs?${searchParams.toString()}`);

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch audit logs',
    };
  }
}

export async function getAuditLogByIdAction(
  id: string,
): Promise<ActionResult<AuditLogDetailResponse>> {
  try {
    const result = await serverApiClient.get<AuditLogDetailResponse>(
      `/api/v1/admin/audit/logs/${id}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch audit log',
    };
  }
}

export async function getAuditSummaryAction(
  params: AuditSummaryQuery,
): Promise<ActionResult<AuditSummaryResponse>> {
  try {
    const validated = auditSummaryQuerySchema.parse(params);
    const searchParams = new URLSearchParams();
    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const result = await serverApiClient.get<AuditSummaryResponse>(
      `/api/v1/admin/audit/summary?${searchParams.toString()}`,
    );
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch audit summary',
    };
  }
}

export async function exportAuditLogsAction(
  params: AuditExportQuery,
): Promise<ActionResult<{ content: string; contentType: string; filename: string }>> {
  try {
    const validated = auditExportQuerySchema.parse(params);
    const searchParams = new URLSearchParams();
    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const result = await serverApiClient.get<{
      content: string;
      contentType: string;
      filename: string;
    }>(`/api/v1/admin/audit/export?${searchParams.toString()}`);

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to export audit logs',
    };
  }
}
