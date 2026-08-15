// src/services/inventory/equipment/rentalStores.ts
// Rental store operations — backed by the shared `rentalStores` lookup table in
// Postgres, via /inventory/categories/lookups/rentalStores on the API.
import { inventoryApiRequest, ApiError } from '../inventoryApi';

export interface RentalStore {
  id?: string;
  name: string;
  location?: string;
  userId: string;
  createdAt?: any;
}

interface RentalStoreRow {
  id: number;
  name: string;
  location: string | null;
  userId: number;
  createdAt: string;
}

interface RentalStoreResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

/**
 * Get all rental stores for a user
 */
export const getRentalStores = async (
  _userId: string
): Promise<RentalStoreResponse<RentalStore[]>> => {
  try {
    const rows = await inventoryApiRequest<RentalStoreRow[]>(
      '/inventory/categories/lookups/rentalStores'
    );
    const stores: RentalStore[] = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      location: r.location ?? undefined,
      userId: String(r.userId),
      createdAt: r.createdAt,
    }));
    return { success: true, data: stores };
  } catch (error) {
    console.error('Error getting rental stores:', error);
    return { success: false, error: errorMessage(error, 'Failed to load rental stores') };
  }
};

/**
 * Add a new rental store
 */
export const addRentalStore = async (
  name: string,
  _userId: string
): Promise<RentalStoreResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Rental store name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Rental store name must be 30 characters or less' };
    }

    const row = await inventoryApiRequest<RentalStoreRow>(
      '/inventory/categories/lookups/rentalStores',
      {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      }
    );
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error adding rental store:', error);
    return { success: false, error: errorMessage(error, 'Failed to add rental store') };
  }
};
