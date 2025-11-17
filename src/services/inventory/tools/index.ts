// src/services/inventory/tools/index.ts

/**
 * Tools Services - Barrel Export
 * 
 * Modular structure for tools management:
 * - tool.types.ts: TypeScript interfaces and types
 * - tool.queries.ts: READ operations
 * - tool.mutations.ts: WRITE operations
 * - sections.ts: Tool sections (Level 2)
 * - categories.ts: Tool categories (Level 3)
 * - subcategories.ts: Tool subcategories (Level 4)
 */

// ✅ Queries - READ operations
export {
  getTools,
  getToolItem,
  getToolsByTrade,
  getAvailableTools
} from './tool.queries';

// ✅ Mutations - WRITE operations
export {
  createToolItem,
  updateToolItem,
  deleteToolItem,
  updateToolStatus
} from './tool.mutations';

// ✅ Sections (Level 2)
export {
  getToolSections,
  addToolSection,
  updateToolSectionName,
  deleteToolSectionWithChildren,
  getToolSectionUsageStats
} from './sections';

// ✅ Categories (Level 3)
export {
  getToolCategories,
  addToolCategory,
  updateToolCategoryName,
  deleteToolCategoryWithChildren,
  getToolCategoryUsageStats
} from './categories';

// ✅ Subcategories (Level 4)
export {
  getToolSubcategories,
  addToolSubcategory,
  updateToolSubcategoryName,
  deleteToolSubcategoryWithChildren,
  getToolSubcategoryUsageStats
} from './subcategories';

// ✅ Types
export type {
  ToolItem,
  ToolFilters,
  ToolResponse,
  PaginatedToolResponse,
  ToolSection,
  ToolCategory,
  ToolSubcategory
} from './tool.types';

// Import for helper function
import {
  getToolSections,
  addToolSection,
  updateToolSectionName,
  deleteToolSectionWithChildren,
  getToolSectionUsageStats
} from './sections';

import {
  getToolCategories,
  addToolCategory,
  updateToolCategoryName,
  deleteToolCategoryWithChildren,
  getToolCategoryUsageStats
} from './categories';

import {
  getToolSubcategories,
  addToolSubcategory,
  updateToolSubcategoryName,
  deleteToolSubcategoryWithChildren,
  getToolSubcategoryUsageStats
} from './subcategories';

// Helper function for GenericCategoryEditor
export const getToolHierarchyServices = () => ({
  getSections: getToolSections,
  addSection: addToolSection,
  getCategories: getToolCategories,
  addCategory: addToolCategory,
  getSubcategories: getToolSubcategories,
  addSubcategory: addToolSubcategory,
  updateCategoryName: async (categoryId: string, newName: string, level: string, userId: string) => {
    if (level === 'section') {
      return updateToolSectionName(categoryId, newName, userId);
    } else if (level === 'category') {
      return updateToolCategoryName(categoryId, newName, userId);
    } else if (level === 'subcategory') {
      return updateToolSubcategoryName(categoryId, newName, userId);
    }
    return { success: false, error: 'Invalid level' };
  },
  deleteCategoryWithChildren: async (categoryId: string, level: string, userId: string) => {
    if (level === 'section') {
      return deleteToolSectionWithChildren(categoryId, userId);
    } else if (level === 'category') {
      return deleteToolCategoryWithChildren(categoryId, userId);
    } else if (level === 'subcategory') {
      return deleteToolSubcategoryWithChildren(categoryId, userId);
    }
    return { success: false, error: 'Invalid level' };
  },
  getCategoryUsageStats: async (categoryId: string, level: string, userId: string) => {
    if (level === 'section') {
      return getToolSectionUsageStats(categoryId, userId);
    } else if (level === 'category') {
      return getToolCategoryUsageStats(categoryId, userId);
    } else if (level === 'subcategory') {
      return getToolSubcategoryUsageStats(categoryId, userId);
    }
    return { success: false, error: 'Invalid level' };
  }
});