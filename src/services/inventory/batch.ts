import { inventoryApiRequest } from './inventoryApi';

export const INVENTORY_BATCH_LIMIT = 200;
const INVENTORY_BATCH_CONCURRENCY = 3;

function normalizeIds(ids: string[]): string[] {
  return [...new Set(ids.map(String))];
}

/**
 * Fetch collection inventory in bounded parallel batches. The API validates
 * IDs again; this client chunking only lets a collection exceed one request.
 */
export async function fetchInventoryBatches<T>(endpoint: string, ids: string[]): Promise<T[]> {
  const uniqueIds = normalizeIds(ids);
  if (uniqueIds.length === 0) return [];

  const chunks: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += INVENTORY_BATCH_LIMIT) {
    chunks.push(uniqueIds.slice(index, index + INVENTORY_BATCH_LIMIT));
  }

  const results: T[] = [];
  for (let index = 0; index < chunks.length; index += INVENTORY_BATCH_CONCURRENCY) {
    const group = chunks.slice(index, index + INVENTORY_BATCH_CONCURRENCY);
    const groupResults = await Promise.all(
      group.map(chunk => inventoryApiRequest<T[]>(`${endpoint}/batch?ids=${encodeURIComponent(chunk.join(','))}`))
    );
    results.push(...groupResults.flat());
  }
  return results;
}
