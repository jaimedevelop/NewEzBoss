// src/services/categories/index.ts
// Central export file for all category services

// Export types and interfaces
export * from './types';

// Export trade operations
export * from './trades';

// Export section operations
export * from './sections';

// Export category operations
export * from './categories';

// Export subcategory operations
export * from './subcategories';

// Export type operations (both hierarchical and standalone)
export * from './productTypes';

// Export size operations
export * from './sizes';

// Export hierarchy operations
export * from './hierarchy';

// Export management operations (update, delete, stats)
export * from './management';

// Export empty category detection
export * from './emptyCategories';


// Import specific functions for the unified createCategory wrapper
import { addProductTrade } from './trades';
import { addProductSection } from './sections';
import { addProductCategory } from './categories';
import { addProductSubcategory } from './subcategories';
import { addProductType } from './productTypes';
import { addProductSize } from './sizes';
import { DatabaseResult } from './types';

/**
 * Unified category creation function
 * Routes to the appropriate add function based on level
 * 
 * @param name - Category name
 * @param level - Category level ('trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size')
 * @param parentId - Parent category ID (null for trades, required for others)
 * @param userId - User ID
 */
export const createCategory = async (
  name: string,
  level: 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size',
  parentId: string | null,
  userId: string
): Promise<DatabaseResult> => {
  try {
    switch (level) {
      case 'trade':
        // Trades have no parent
        return await addProductTrade(name, userId);
      
      case 'section':
        // Sections need a trade ID
        if (!parentId) {
          return { success: false, error: 'Parent trade ID is required for sections' };
        }
        return await addProductSection(name, parentId, userId);
      
      case 'category':
        // Categories need a section ID
        if (!parentId) {
          return { success: false, error: 'Parent section ID is required for categories' };
        }
        return await addProductCategory(name, parentId, userId);
      
      case 'subcategory':
        // Subcategories need a category ID
        if (!parentId) {
          return { success: false, error: 'Parent category ID is required for subcategories' };
        }
        return await addProductSubcategory(name, parentId, userId);
      
      case 'type':
        // Types need a subcategory ID
        if (!parentId) {
          return { success: false, error: 'Parent subcategory ID is required for types' };
        }
        return await addProductType(name, parentId, userId);
      
      case 'size':
        // Sizes need a trade ID (sizes are trade-specific)
        if (!parentId) {
          return { success: false, error: 'Parent trade ID is required for sizes' };
        }
        return await addProductSize(name, parentId, userId);
      
      default:
        return { 
          success: false, 
          error: `Unknown category level: ${level}` 
        };
    }
  } catch (error) {
    console.error('Error in createCategory:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An error occurred while creating the category'
    };
  }
};