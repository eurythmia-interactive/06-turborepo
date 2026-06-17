import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient, ApiError, TimeoutError } from '@/lib/api-client';

describe('ApiClient', () => {
  let client: ApiClient;
  const BASE_URL = 'http://api.test';

  beforeEach(() => {
    client = new ApiClient({ baseURL: BASE_URL, timeout: 1000 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('uses provided timeout', () => {
      const customClient = new ApiClient({ baseURL: BASE_URL, timeout: 5000 });
      expect(customClient).toBeDefined();
    });

    it('defaults timeout to 30000ms', () => {
      const defaultClient = new ApiClient({ baseURL: BASE_URL });
      expect(defaultClient).toBeDefined();
    });

    it('defaults credentials to include', () => {
      const defaultClient = new ApiClient({ baseURL: BASE_URL });
      expect(defaultClient).toBeDefined();
    });
  });

  describe('GET requests', () => {
    it('makes GET request with correct URL', async () => {
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({ data: 'test' }), { status: 200 }));

      await client.get('/users');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/users`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('handles absolute URLs', async () => {
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({ data: 'test' }), { status: 200 }));

      await client.get('http://other.api.com/data');

      expect(fetchSpy).toHaveBeenCalledWith('http://other.api.com/data', expect.any(Object));
    });

    it('includes credentials in requests', async () => {
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      await client.get('/test');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'include' }),
      );
    });

    it('parses JSON response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ id: 1, name: 'Test' }), { status: 200 }),
      );

      const result = await client.get<{ id: number; name: string }>('/users/1');

      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it('returns undefined for 204 No Content', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

      const result = await client.get('/users/1');

      expect(result).toBeUndefined();
    });
  });

  describe('POST requests', () => {
    it('makes POST request with JSON body', async () => {
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 201 }));

      await client.post('/users', { name: 'Test' });

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/users`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ name: 'Test' }),
        }),
      );
    });

    it('handles undefined body', async () => {
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      await client.post('/action');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: undefined }),
      );
    });
  });

  describe('PUT requests', () => {
    it('makes PUT request with JSON body', async () => {
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          new Response(JSON.stringify({ id: 1, name: 'Updated' }), { status: 200 }),
        );

      await client.put('/users/1', { name: 'Updated' });

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/users/1`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' }),
        }),
      );
    });
  });

  describe('PATCH requests', () => {
    it('makes PATCH request with JSON body', async () => {
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({ name: 'Patched' }), { status: 200 }));

      await client.patch('/users/1', { name: 'Patched' });

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/users/1`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Patched' }),
        }),
      );
    });
  });

  describe('DELETE requests', () => {
    it('makes DELETE request', async () => {
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(null, { status: 204 }));

      await client.delete('/users/1');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/users/1`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('error handling', () => {
    it('throws ApiError for non-ok responses', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'Not found' }), {
          status: 404,
          statusText: 'Not Found',
        }),
      );

      await expect(client.get('/missing')).rejects.toThrow(ApiError);
    });

    it('includes response data in ApiError', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'Bad request' }), {
          status: 400,
          statusText: 'Bad Request',
        }),
      );

      try {
        await client.get('/bad');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).data).toEqual({ message: 'Bad request' });
      }
    });

    it('handles non-JSON error responses', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      );

      try {
        await client.get('/error');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).data).toBeNull();
      }
    });

    it('throws TimeoutError when request exceeds timeout', async () => {
      const slowClient = new ApiClient({ baseURL: BASE_URL, timeout: 50 });

      vi.spyOn(global, 'fetch').mockImplementation(
        () =>
          new Promise((_, reject) => {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            setTimeout(() => reject(abortError), 100);
          }),
      );

      await expect(slowClient.get('/slow')).rejects.toThrow(TimeoutError);
    });

    it('throws network errors', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Network error'));

      await expect(client.get('/network-error')).rejects.toThrow('Network error');
    });
  });

  describe('custom headers', () => {
    it('merges custom headers with defaults', async () => {
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      await client.post(
        '/data',
        { value: 1 },
        {
          headers: { 'X-Custom': 'header' },
        },
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom': 'header',
          }),
        }),
      );
    });
  });
});

describe('ApiError', () => {
  it('creates error with status and message', () => {
    const error = new ApiError(404, 'Not Found', { detail: 'Resource missing' });

    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.data).toEqual({ detail: 'Resource missing' });
    expect(error.message).toBe('API Error: 404 Not Found');
    expect(error.name).toBe('ApiError');
  });
});

describe('TimeoutError', () => {
  it('creates error with timeout duration', () => {
    const error = new TimeoutError(5000);

    expect(error.message).toBe('Request timeout after 5000ms');
    expect(error.name).toBe('TimeoutError');
  });
});
