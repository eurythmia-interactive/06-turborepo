import { cookies, headers } from 'next/headers';
import { ApiClient, type RequestOptions } from './api-client';
import { clientEnv } from '../env';

const API_BASE_URL = clientEnv.NEXT_PUBLIC_API_URL;

class ServerApiClient extends ApiClient {
  constructor() {
    super({
      baseURL: API_BASE_URL,
      timeout: 30000,
      credentials: 'include',
    });
  }

  private async getServerHeaders(): Promise<Headers> {
    const headersList = await headers();
    const cookieStore = await cookies();

    const newHeaders = new Headers();

    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
    if (cookieHeader) {
      newHeaders.set('Cookie', cookieHeader);
    }

    const authHeader = headersList.get('Authorization');
    if (authHeader) {
      newHeaders.set('Authorization', authHeader);
    }

    return newHeaders;
  }

  override async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const serverHeaders = await this.getServerHeaders();
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
      headers: {
        ...Object.fromEntries(serverHeaders.entries()),
        ...options?.headers,
      },
    });
  }

  override async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const serverHeaders = await this.getServerHeaders();
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(serverHeaders.entries()),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  override async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const serverHeaders = await this.getServerHeaders();
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(serverHeaders.entries()),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  override async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const serverHeaders = await this.getServerHeaders();
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(serverHeaders.entries()),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  override async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const serverHeaders = await this.getServerHeaders();
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
      headers: {
        ...Object.fromEntries(serverHeaders.entries()),
        ...options?.headers,
      },
    });
  }
}

export const serverApiClient = new ServerApiClient();
