import type { StoreResult } from '../store.types';

const SERP_API_KEY = import.meta.env.VITE_SERP_API;
const BASE_URL = '/serpapi/search.json';

export async function searchHomeDepot(query: string, zipCode?: string): Promise<StoreResult[]> {
    const params = new URLSearchParams({
        engine: 'home_depot',
        q: query,
        api_key: SERP_API_KEY,
        ...(zipCode && { delivery_zip: zipCode }),
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`);

    if (!res.ok) {
        throw new Error(`Home Depot search failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const products = data?.products ?? [];

    return products.map((item: any): StoreResult => ({
        itemId: `hd-${item.product_id ?? item.item_id ?? Math.random()}`,
        name: item.title ?? '',
        brand: item.brand ?? '',
        description: item.description ?? item.title ?? '',
        price: item.price ?? 0,
        sku: item.model_number ?? item.store_sku ?? item.product_id ?? '',
        imageUrl: item.thumbnail ?? item.images?.[0] ?? undefined,
        store: 'home_depot',
        storeName: 'Home Depot',
    }));
}