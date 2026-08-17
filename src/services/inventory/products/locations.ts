// src/services/inventory/products/locations.ts
// Storage location operations — backed by the shared `locations` lookup table in
// Postgres, via /inventory/categories/lookups/locations on the API. Shared by both
// products and tools, scoped by itemType.
import { inventoryApiRequest, ApiError } from '../inventoryApi';

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

export interface Location {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

interface LocationRow {
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
 * Add a new storage location
 */
export const addLocation = async (
  name: string,
  _userId: string,
  itemType: 'product' | 'tool' = 'product'
): Promise<DatabaseResult> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Location name cannot be empty' };
    }
    if (name.length > 50) {
      return { success: false, error: 'Location name must be 50 characters or less' };
    }

    const row = await inventoryApiRequest<LocationRow>('/inventory/categories/lookups/locations', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), itemType }),
    });

    return { success: true, id: String(row.id) };
  } catch (error) {
    console.error('Error adding location:', error);
    return { success: false, error: errorMessage(error, 'Failed to add location') };
  }
};

/**
 * Get all storage locations for a user
 */
export const getLocations = async (
  _userId: string,
  itemType: 'product' | 'tool' = 'product'
): Promise<DatabaseResult<Location[]>> => {
  try {
    const rows = await inventoryApiRequest<LocationRow[]>(
      `/inventory/categories/lookups/locations?itemType=${itemType}`
    );
    const locations: Location[] = rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      userId: String(r.userId),
      createdAt: r.createdAt,
    }));
    return { success: true, data: locations };
  } catch (error) {
    console.error('Error getting locations:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch locations') };
  }
};
