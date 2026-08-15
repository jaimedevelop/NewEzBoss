// src/services/categories/categories.ts
// Category-level operations — backed by the shared Postgres hierarchy API.

import { DatabaseResult, ProductCategory } from './types';
import {
  createHierarchyNode,
  errorMessage,
  listHierarchy,
  stringifyRow,
} from './hierarchyApi';

/**
 * Add a new product category
 * @param name - Category name
 * @param sectionId - The section's id
 * @param userId - Unused; kept for call-site compatibility
 */
export const addProductCategory = async (
  name: string,
  sectionId: string,
  _userId: string
): Promise<DatabaseResult> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Category name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Category name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('category', name.trim(), sectionId);
    return { success: true, id: String(row.id) };
  } catch (error) {
    console.error('Error adding product category:', error);
    return { success: false, error: errorMessage(error, 'Failed to add category') };
  }
};

/**
 * Get all categories for a specific section
 */
export const getProductCategories = async (
  sectionId: string,
  _userId: string
): Promise<DatabaseResult<ProductCategory[]>> => {
  try {
    const rows = await listHierarchy('category', sectionId);
    const categories = rows.map(stringifyRow) as unknown as ProductCategory[];
    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting product categories:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch categories') };
  }
};
