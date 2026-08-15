// src/services/inventory/tools/brands.ts
// Tool brand operations — backed by the shared `brands` lookup table in Postgres
// (itemType='tool'), via /inventory/categories/lookups/brands on the API.
import { ToolResponse } from './tool.types';
import { inventoryApiRequest, ApiError } from '../inventoryApi';

export interface ToolBrand {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

interface BrandRow {
  id: number;
  name: string;
  itemType: 'product' | 'tool';
  userId: number;
  createdAt: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

/**
 * Get all tool brands for a user
 */
export const getToolBrands = async (
  _userId: string
): Promise<ToolResponse<ToolBrand[]>> => {
  try {
    const rows = await inventoryApiRequest<BrandRow[]>(
      '/inventory/categories/lookups/brands?itemType=tool'
    );
    const brands: ToolBrand[] = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      userId: String(r.userId),
      createdAt: r.createdAt,
    }));
    return { success: true, data: brands };
  } catch (error) {
    console.error('Error getting tool brands:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch tool brands') };
  }
};

/**
 * Add a new tool brand
 */
export const addToolBrand = async (
  name: string,
  _userId: string
): Promise<ToolResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Brand name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Brand name must be 30 characters or less' };
    }

    const row = await inventoryApiRequest<BrandRow>('/inventory/categories/lookups/brands', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), itemType: 'tool' }),
    });
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error adding tool brand:', error);
    return { success: false, error: errorMessage(error, 'Failed to add tool brand') };
  }
};
