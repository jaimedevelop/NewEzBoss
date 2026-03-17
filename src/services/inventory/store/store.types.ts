export type SupportedStore = 'home_depot' | 'lowes';

export interface StoreSearchParams {
    query: string;
    stores: SupportedStore[];
    zipCode?: string;
}

export interface StoreResult {
    itemId: string;
    name: string;
    brand: string;
    description: string;
    price: number;
    sku: string;
    imageUrl?: string;
    store: SupportedStore;
    storeName: string;
}

export interface StoreSearchResponse {
    results: StoreResult[];
    errors: { store: SupportedStore; message: string }[];
}