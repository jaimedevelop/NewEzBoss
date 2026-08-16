// src/services/categories/productTypes.ts
// Type-level category operations — backed by the shared Postgres hierarchy API.

import { DatabaseResult, ProductType } from './types';
import {
  createHierarchyNode,
  errorMessage,
  listHierarchy,
  stringifyRow,
} from './hierarchyApi';

/**
 * Add a new product type
 * @param name - Type name
 * @param subcategoryId - The subcategory's id
 * @param userId - Unused; kept for call-site compatibility
 */
export const addProductType = async (
  name: string,
  subcategoryId: string,
  _userId: string
): Promise<DatabaseResult> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Type name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Type name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('type', 'product', name.trim(), subcategoryId);
    return { success: true, id: String(row.id) };
  } catch (error) {
    console.error('Error adding product type:', error);
    return { success: false, error: errorMessage(error, 'Failed to add type') };
  }
};

/**
 * Get all types for a specific subcategory
 */
export const getProductTypes = async (
  subcategoryId: string,
  _userId: string
): Promise<DatabaseResult<ProductType[]>> => {
  try {
    const rows = await listHierarchy('type', 'product', subcategoryId);
    const types = rows.map(stringifyRow) as unknown as ProductType[];
    return { success: true, data: types };
  } catch (error) {
    console.error('Error getting product types:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch types') };
  }
};
