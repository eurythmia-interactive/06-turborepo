import { cacheLife } from 'next/cache';

export interface CachedStats {
  totalUsers: number;
  activeSessions: number;
  lastUpdated: string;
}

export async function getDashboardStats(): Promise<CachedStats> {
  'use cache';
  cacheLife('minutes');

  return {
    totalUsers: 1247,
    activeSessions: 89,
    lastUpdated: '2026-01-01T00:00:00.000Z',
  };
}
