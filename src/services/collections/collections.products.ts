// src/services/collections/collections.products.ts
import { getProductsByIds } from '../inventory/products/products.queries';
import type { DatabaseResult } from './collections.types';

/**
 * Get products for collection tabs by IDs.
 * Uses the bounded owner-scoped API batch contract; it never loads the full
 * inventory list just to resolve a collection tab.
 */
export const getProductsForCollectionTabs = async (
  productIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (productIds.length === 0) {
      return { success: true, data: [] };
    }

    const result = await getProductsByIds(productIds);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    return { success: false, error };
  }
};
