import { describe, it, expect, vi } from 'vitest';
import { RequestQueue } from '@/lib/request-queue';

describe('RequestQueue', () => {
  describe('enqueue', () => {
    it('executes request function', async () => {
      const queue = new RequestQueue();
      const requestFn = vi.fn().mockResolvedValue('result');

      const result = await queue.enqueue(requestFn);

      expect(result).toBe('result');
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from request function', async () => {
      const queue = new RequestQueue();
      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));

      await expect(queue.enqueue(requestFn)).rejects.toThrow('Request failed');
    });
  });

  describe('waitForRefresh', () => {
    it('executes refresh function', async () => {
      const queue = new RequestQueue();
      const refreshFn = vi.fn().mockResolvedValue(true);

      const result = await queue.waitForRefresh(refreshFn);

      expect(result).toBe(true);
      expect(refreshFn).toHaveBeenCalledTimes(1);
    });

    it('returns false when refresh fails', async () => {
      const queue = new RequestQueue();
      const refreshFn = vi.fn().mockResolvedValue(false);

      const result = await queue.waitForRefresh(refreshFn);

      expect(result).toBe(false);
    });

    it('deduplicates concurrent refresh calls', async () => {
      const queue = new RequestQueue();
      let resolveRefresh: (value: boolean) => void;
      const refreshFn = vi.fn().mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            resolveRefresh = resolve;
          }),
      );

      const promise1 = queue.waitForRefresh(refreshFn);
      const promise2 = queue.waitForRefresh(refreshFn);
      const promise3 = queue.waitForRefresh(refreshFn);

      resolveRefresh!(true);

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
      expect(refreshFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('isProcessing', () => {
    it('returns false when not processing', () => {
      const queue = new RequestQueue();

      expect(queue.isProcessing).toBe(false);
    });
  });

  describe('length', () => {
    it('returns 0 when queue is empty', () => {
      const queue = new RequestQueue();

      expect(queue.length).toBe(0);
    });
  });
});
