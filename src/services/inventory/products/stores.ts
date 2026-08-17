// src/services/inventory/products/stores.ts
// Store operations — backed by the shared `productStores` lookup table in
// Postgres, via /inventory/categories/lookups/productStores on the API.
import { inventoryApiRequest, ApiError } from '../inventoryApi';

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

export interface Store {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

interface StoreRow {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

/**
 * Add a new store
 */
export const addStore = async (name: string, _userId: string): Promise<DatabaseResult> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Store name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Store name must be 30 characters or less' };
    }

    const row = await inventoryApiRequest<StoreRow>('/inventory/categories/lookups/productStores', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() }),
    });

    return { success: true, id: String(row.id) };
  } catch (error) {
    console.error('Error adding store:', error);
    return { success: false, error: errorMessage(error, 'Failed to add store') };
  }
};

/**
 * Get all stores for a user
 */
export const getStores = async (_userId: string): Promise<DatabaseResult<Store[]>> => {
  try {
    const rows = await inventoryApiRequest<StoreRow[]>('/inventory/categories/lookups/productStores');
    const stores: Store[] = rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      userId: String(r.userId),
      createdAt: r.createdAt,
    }));
    return { success: true, data: stores };
  } catch (error) {
    console.error('Error getting stores:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch stores') };
  }
};
