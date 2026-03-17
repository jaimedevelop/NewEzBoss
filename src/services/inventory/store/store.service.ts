import type { StoreSearchParams, StoreSearchResponse, SupportedStore } from './store.types';
import { searchHomeDepot } from './adapters/homeDepot.adapter';
import { searchLowes } from './adapters/lowes.adapter';

const adapterMap: Record<SupportedStore, (query: string, zip?: string) => Promise<any[]>> = {
    home_depot: searchHomeDepot,
    lowes: searchLowes,
};

export async function searchStoreProducts(params: StoreSearchParams): Promise<StoreSearchResponse> {
    const { query, stores, zipCode } = params;

    const settled = await Promise.allSettled(
        stores.map(store => adapterMap[store](query, zipCode))
    );

    const results: StoreResult[] = [];
    const errors: { store: SupportedStore; message: string }[] = [];

    settled.forEach((outcome, i) => {
        const store = stores[i];
        if (outcome.status === 'fulfilled') {
            results.push(...outcome.value);
        } else {
            console.error(`[store.service] ${store} search error:`, outcome.reason);
            errors.push({ store, message: outcome.reason?.message ?? 'Unknown error' });
        }
    });

    return { results, errors };
}