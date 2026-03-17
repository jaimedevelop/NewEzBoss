import type { StoreResult } from '../store.types';

const SERP_API_KEY = import.meta.env.VITE_SERP_API;
const BASE_URL = '/serpapi/search.json';

export async function searchLowes(query: string, zipCode?: string): Promise<StoreResult[]> {
    const params = new URLSearchParams({
        engine: 'lowes',
        q: query,
        api_key: SERP_API_KEY,
        ...(zipCode && { zip: zipCode }),
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`);

    if (!res.ok) {
        throw new Error(`Lowe's search failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const products = data?.products ?? [];

    return products.map((item: any): StoreResult => ({
        itemId: `lw-${item.product_id ?? item.item_id ?? Math.random()}`,
        name: item.title ?? '',
        brand: item.brand ?? '',
        description: item.description ?? item.title ?? '',
        price: item.price ?? 0,
        sku: item.model_number ?? item.item_id ?? '',
        imageUrl: item.thumbnail ?? item.images?.[0] ?? undefined,
        store: 'lowes',
        storeName: "Lowe's",
    }));
}