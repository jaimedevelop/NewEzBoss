// src/services/categories/sizes.ts
// Size-level operations (trade-specific) — backed by the shared Postgres hierarchy API.

import { DatabaseResult, ProductSize } from './types';
import {
  createHierarchyNode,
  deleteHierarchyNode,
  errorMessage,
  getHierarchyUsage,
  listHierarchy,
  renameHierarchyNode,
  stringifyRow,
  totalItemCount,
} from './hierarchyApi';

/**
 * Add a new product size
 */
export const addProductSize = async (
  name: string,
  tradeId: string,
  _userId: string
): Promise<DatabaseResult> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Size name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Size name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('size', 'product', name.trim(), tradeId);
    return { success: true, id: String(row.id) };
  } catch (error) {
    console.error('Error adding product size:', error);
    return { success: false, error: errorMessage(error, 'Failed to add size') };
  }
};

/**
 * Get all sizes for a user, optionally filtered by trade
 * @param userId - Unused; kept for call-site compatibility
 * @param tradeId - Optional: filter sizes to this trade
 */
export const getProductSizes = async (
  _userId: string,
  tradeId?: string
): Promise<DatabaseResult<ProductSize[]>> => {
  try {
    const rows = await listHierarchy('size', 'product', tradeId);
    const sizes = rows.map(stringifyRow) as unknown as ProductSize[];
    return { success: true, data: sizes };
  } catch (error) {
    console.error('Error getting product sizes:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch sizes') };
  }
};

/**
 * Update a product size name
 */
export const updateProductSizeName = async (
  sizeId: string,
  newName: string,
  _tradeId: string,
  _userId: string
): Promise<DatabaseResult> => {
  try {
    if (!newName.trim()) {
      return { success: false, error: 'Size name cannot be empty' };
    }
    if (newName.length > 30) {
      return { success: false, error: 'Size name must be 30 characters or less' };
    }

    await renameHierarchyNode('size', sizeId, newName.trim());
    return { success: true };
  } catch (error) {
    console.error('Error updating product size:', error);
    return { success: false, error: errorMessage(error, 'Failed to update size') };
  }
};

/**
 * Delete a product size. Blocked if any products still reference it.
 */
export const deleteProductSize = async (
  sizeId: string,
  _userId: string
): Promise<DatabaseResult> => {
  try {
    const usage = await getHierarchyUsage('size', sizeId);
    const itemCount = totalItemCount(usage);
    if (itemCount > 0) {
      return {
        success: false,
        error: `Cannot delete size: ${itemCount} products are using this size. Please reassign or delete those products first.`,
      };
    }

    await deleteHierarchyNode('size', sizeId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting product size:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete size') };
  }
};

/**
 * Get count of products using a specific size, identified by id.
 * @param sizeId - The size's id (kept as `sizeName` param name for call-site compatibility, but now expects the id)
 */
export const getSizeUsageCount = async (
  sizeId: string,
  _userId: string
): Promise<DatabaseResult<number>> => {
  try {
    const usage = await getHierarchyUsage('size', sizeId);
    return { success: true, data: totalItemCount(usage) };
  } catch (error) {
    console.error('Error getting size usage count:', error);
    return { success: false, error: errorMessage(error, 'Failed to get size usage') };
  }
};
