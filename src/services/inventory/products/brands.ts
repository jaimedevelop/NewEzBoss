// src/services/inventory/products/brands.ts
// Brand lookup operations — backed by the shared Postgres lookups API.
import { inventoryApiRequest, ApiError } from '../inventoryApi';

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

export interface Brand {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

interface BrandRow {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

function toBrand(row: BrandRow): Brand {
  return {
    id: String(row.id),
    name: row.name,
    userId: String(row.userId),
    createdAt: row.createdAt,
  };
}

/**
 * Add a new brand
 */
export const addBrand = async (name: string, _userId: string): Promise<DatabaseResult> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Brand name cannot be empty' };
    }
    if (name.length > 50) {
      return { success: false, error: 'Brand name must be 50 characters or less' };
    }

    const row = await inventoryApiRequest<BrandRow>('/inventory/categories/lookups/brands', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), itemType: 'product' }),
    });
    return { success: true, id: String(row.id) };
  } catch (error) {
    console.error('Error adding brand:', error);
    return { success: false, error: errorMessage(error, 'Failed to add brand') };
  }
};

/**
 * Get all brands for a user
 */
export const getBrands = async (_userId: string): Promise<DatabaseResult<Brand[]>> => {
  try {
    const rows = await inventoryApiRequest<BrandRow[]>(
      '/inventory/categories/lookups/brands?itemType=product'
    );
    return { success: true, data: rows.map(toBrand) };
  } catch (error) {
    console.error('Error getting brands:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch brands') };
  }
};
