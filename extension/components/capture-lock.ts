let queue: Promise<unknown> = Promise.resolve();

/** Coordinate popup and worker read-modify-write operations on capture storage. */
export async function withCaptureLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return await navigator.locks.request('second-brain-captures', task);
  }
  const result = queue.then(task, task);
  queue = result.catch(() => undefined);
  return result;
}
