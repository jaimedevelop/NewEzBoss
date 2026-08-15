// src/services/categories/sections.ts
// Section-level category operations — backed by the shared Postgres hierarchy API.

import { DatabaseResult, ProductSection } from './types';
import {
  createHierarchyNode,
  errorMessage,
  listHierarchy,
  stringifyRow,
} from './hierarchyApi';

/**
 * Add a new product section
 * @param name - Section name
 * @param tradeId - The trade's id
 * @param userId - Unused; kept for call-site compatibility
 */
export const addProductSection = async (
  name: string,
  tradeId: string,
  _userId: string
): Promise<DatabaseResult> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Section name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Section name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('section', name.trim(), tradeId);
    return { success: true, id: String(row.id) };
  } catch (error) {
    console.error('Error adding product section:', error);
    return { success: false, error: errorMessage(error, 'Failed to add section') };
  }
};

/**
 * Get all sections for a specific trade
 */
export const getProductSections = async (
  tradeId: string,
  _userId: string
): Promise<DatabaseResult<ProductSection[]>> => {
  try {
    const rows = await listHierarchy('section', tradeId);
    const sections = rows.map(stringifyRow) as unknown as ProductSection[];
    return { success: true, data: sections };
  } catch (error) {
    console.error('Error getting product sections:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch sections') };
  }
};

/**
 * Get all available section names across all trades (for dropdowns/filters)
 */
export const getAllAvailableSections = async (
  _userId: string
): Promise<DatabaseResult<string[]>> => {
  try {
    const rows = await listHierarchy('section');
    const uniqueSections = Array.from(new Set(rows.map(r => r.name))).sort();
    return { success: true, data: uniqueSections };
  } catch (error) {
    console.error('Error getting all available sections:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch sections') };
  }
};
