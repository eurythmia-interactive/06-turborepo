'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/authenticated-api-client';
import type { RequestOptions } from '@/lib/api-client';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (requestFn: () => Promise<T>, options?: UseApiOptions<T>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestFn();
      setData(result);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, error, isLoading, execute };
}

export function useApiClient() {
  return {
    get: <T>(endpoint: string, options?: RequestOptions) => apiClient.get<T>(endpoint, options),
    post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
      apiClient.post<T>(endpoint, body, options),
    put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
      apiClient.put<T>(endpoint, body, options),
    patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
      apiClient.patch<T>(endpoint, body, options),
    delete: <T>(endpoint: string, options?: RequestOptions) =>
      apiClient.delete<T>(endpoint, options),
  };
}
