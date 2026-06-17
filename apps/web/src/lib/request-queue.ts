export class RequestQueue {
  private queue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  async enqueue<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      if (!this.isRefreshing) {
        this.processQueue(requestFn);
      }
    });
  }

  private async processQueue<T>(requestFn: () => Promise<T>): Promise<void> {
    this.isRefreshing = true;

    try {
      const result = await requestFn();

      for (const item of this.queue) {
        item.resolve(result);
      }
    } catch (error) {
      for (const item of this.queue) {
        item.reject(error);
      }
    } finally {
      this.queue = [];
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async waitForRefresh(refreshFn: () => Promise<boolean>): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = refreshFn();
    return this.refreshPromise;
  }

  get isProcessing(): boolean {
    return this.isRefreshing;
  }

  get length(): number {
    return this.queue.length;
  }
}
