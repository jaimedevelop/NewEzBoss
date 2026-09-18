import type { StoreResult } from '../store.types';
import { inventoryApiRequest } from '../../inventoryApi';

export async function searchLowes(query: string, zipCode?: string): Promise<StoreResult[]> {
    const response = await inventoryApiRequest<{ results: StoreResult[] }>('/inventory/store-search', {
        method: 'POST',
        body: JSON.stringify({ query, store: 'lowes', zipCode }),
    });
    return response.results;
}
