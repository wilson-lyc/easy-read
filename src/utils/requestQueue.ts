export interface QueueTask<T> {
  execute: () => Promise<T>;
  retries?: number;
}

/**
 * 请求队列
 *
 * 控制并发请求数，支持重试（指数退避）。
 */
export default class RequestQueue {
  private concurrency: number;
  private running = 0;
  private queue: Array<{
    task: () => Promise<unknown>;
    retries: number;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  /**
   * 添加任务到队列
   */
  async add<T>(task: QueueTask<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task: task.execute,
        retries: task.retries ?? 2,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processNext();
    });
  }

  /**
   * 处理下一个任务
   */
  private processNext(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.running++;

      this.runWithRetry(item)
        .catch((err) => item.reject(err))
        .finally(() => {
          this.running--;
          this.processNext();
        });
    }
  }

  /**
   * 带指数退避重试的执行
   */
  private async runWithRetry(item: {
    task: () => Promise<unknown>;
    retries: number;
    resolve: (value: unknown) => void;
  }): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= item.retries; attempt++) {
      try {
        const result = await item.task();
        item.resolve(result);
        return;
      } catch (err) {
        lastError = err;
        if (attempt < item.retries) {
          // 指数退避: 1s, 3s
          const delay = attempt === 0 ? 1000 : 3000;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * 当前队列长度
   */
  get length(): number {
    return this.queue.length + this.running;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
  }
}
