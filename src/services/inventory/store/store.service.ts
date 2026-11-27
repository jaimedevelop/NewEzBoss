import { ApiError } from "../inventoryApi";
import type { StoreResult, StoreSearchParams, StoreSearchResponse, SupportedStore } from './store.types';
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
    const errors: StoreSearchResponse["errors"] = [];

    settled.forEach((outcome, i) => {
        const store = stores[i];
        if (outcome.status === 'fulfilled') {
            results.push(...outcome.value);
        } else {
            console.error(`[store.service] ${store} search error:`, outcome.reason);
            const details = outcome.reason instanceof ApiError ? outcome.reason.details : undefined;
            const storeUrl = details?.code === 'STORE_BLOCKED' ? details.storeUrl : undefined;
            errors.push({ store, message: outcome.reason?.message ?? 'Unknown error', storeUrl });
        }
    });

    return { results, errors };
}