export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index: number = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex: number = 0;
  const workerCount: number = Math.max(Math.min(limit, items.length), 1);

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex: number = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workers: Promise<void>[] = [];

  for (let index: number = 0; index < workerCount; index += 1) {
    workers.push(runWorker());
  }

  await Promise.all(workers);
  return results;
}
