import { chunkArray, runWithConcurrency } from './batchConcurrencyUtils';

describe('batchConcurrencyUtils', () => {
  it('chunks arrays by size', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('chunks operations into batches of 100', () => {
    const sourceItems: number[] = [];

    for (let index: number = 0; index < 250; index += 1) {
      sourceItems.push(index);
    }

    const chunks: number[][] = chunkArray(sourceItems, 100);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
  });

  it('runs workers with bounded concurrency', async () => {
    let activeWorkers: number = 0;
    let maxActiveWorkers: number = 0;

    await runWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      activeWorkers += 1;
      maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);
      await new Promise((resolve: (value: unknown) => void) => {
        window.setTimeout(resolve, 10);
      });
      activeWorkers -= 1;
      return true;
    });

    expect(maxActiveWorkers).toBeLessThanOrEqual(2);
  });
});
