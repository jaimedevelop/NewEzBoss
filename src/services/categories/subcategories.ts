// src/services/categories/subcategories.ts
// Subcategory-level operations — backed by the shared Postgres hierarchy API.

import { DatabaseResult, ProductSubcategory } from './types';
import {
  createHierarchyNode,
  errorMessage,
  listHierarchy,
  stringifyRow,
} from './hierarchyApi';

/**
 * Add a new product subcategory
 * @param name - Subcategory name
 * @param categoryId - The category's id
 * @param userId - Unused; kept for call-site compatibility
 */
export const addProductSubcategory = async (
  name: string,
  categoryId: string,
  _userId: string
): Promise<DatabaseResult> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Subcategory name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Subcategory name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('subcategory', name.trim(), categoryId);
    return { success: true, id: String(row.id) };
  } catch (error) {
    console.error('Error adding product subcategory:', error);
    return { success: false, error: errorMessage(error, 'Failed to add subcategory') };
  }
};

/**
 * Get all subcategories for a specific category
 */
export const getProductSubcategories = async (
  categoryId: string,
  _userId: string
): Promise<DatabaseResult<ProductSubcategory[]>> => {
  try {
    const rows = await listHierarchy('subcategory', categoryId);
    const subcategories = rows.map(stringifyRow) as unknown as ProductSubcategory[];
    return { success: true, data: subcategories };
  } catch (error) {
    console.error('Error getting product subcategories:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch subcategories') };
  }
};
