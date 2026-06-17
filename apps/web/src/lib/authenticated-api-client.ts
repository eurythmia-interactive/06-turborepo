'use client';

import { ApiClient, ApiError, type RequestOptions } from './api-client';
import { getAccessToken, clearTokens } from './token-store';
import { RequestQueue } from './request-queue';
import { clientEnv } from '../env';

const API_BASE_URL = clientEnv.NEXT_PUBLIC_API_URL;

class AuthenticatedApiClient extends ApiClient {
  private refreshQueue = new RequestQueue();
  private isRefreshing = false;

  constructor() {
    super({
      baseURL: API_BASE_URL,
      timeout: 30000,
      credentials: 'include',
    });
  }

  protected async requestWithAuth<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = getAccessToken();

    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      return await this.request<T>(endpoint, {
        ...options,
        headers,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return this.handleUnauthorized<T>(endpoint, options);
      }
      throw error;
    }
  }

  private async handleUnauthorized<T>(endpoint: string, options: RequestOptions): Promise<T> {
    if (this.isRefreshing) {
      await this.refreshQueue.waitForRefresh(() => this.refreshToken());
    } else {
      this.isRefreshing = true;
      try {
        const success = await this.refreshToken();
        if (!success) {
          clearTokens();
          throw new ApiError(401, 'Unauthorized', { message: 'Session expired' });
        }
      } finally {
        this.isRefreshing = false;
      }
    }

    const token = getAccessToken();
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return this.request<T>(endpoint, {
      ...options,
      headers,
    });
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  override async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.requestWithAuth<T>(endpoint, { ...options, method: 'GET' });
  }

  override async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.requestWithAuth<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  override async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.requestWithAuth<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  override async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.requestWithAuth<T>(endpoint, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  override async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.requestWithAuth<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new AuthenticatedApiClient();
