// src/services/collections/collections.products.ts
import { getProducts } from '../inventory/products/products.queries';
import type { DatabaseResult } from './collections.types';

/**
 * Get products for collection tabs by IDs.
 * Backend has no by-IDs endpoint, so this fetches the full product list
 * (already Postgres-backed) and filters client-side.
 */
export const getProductsForCollectionTabs = async (
  productIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (productIds.length === 0) {
      return { success: true, data: [] };
    }

    const idSet = new Set(productIds.map(String));
    const result = await getProducts();
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.filter((p: any) => idSet.has(String(p.id))) };
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    return { success: false, error };
  }
};
