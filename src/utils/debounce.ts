/**
 * 创建一个防抖函数
 * 在 `delay` 毫秒内连续调用只执行最后一次
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

/**
 * 创建一个防抖的异步函数
 * 返回 Promise，最后一次调用的 Promise 会 resolve，之前的会被忽略
 */
export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let rejectPrev: ((reason: unknown) => void) | null = null;

  return (...args: Parameters<T>): Promise<unknown> => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    if (rejectPrev !== null) {
      rejectPrev(new Error("debounce: 被新的调用取消"));
    }

    return new Promise((resolve, reject) => {
      rejectPrev = reject;
      timer = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (err) {
          reject(err);
        }
        timer = null;
        rejectPrev = null;
      }, delay);
    });
  };
}
