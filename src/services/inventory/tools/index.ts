// Queries
export {
  getTools,
  getToolItem,
  getToolsByTrade,
} from './tool.queries';

// Mutations
export {
  createToolItem,
  updateToolItem,
  deleteToolItem,
} from './tool.mutations';

// Sections
export {
  getToolSections,
  addToolSection,
  updateToolSectionName,
  deleteToolSectionWithChildren,
  getToolSectionUsageStats
} from './sections';

// Categories
export {
  getToolCategories,
  addToolCategory,
  updateToolCategoryName,
  deleteToolCategoryWithChildren,
  getToolCategoryUsageStats
} from './categories';

// Subcategories
export {
  getToolSubcategories,
  addToolSubcategory,
  updateToolSubcategoryName,
  deleteToolSubcategoryWithChildren,
  getToolSubcategoryUsageStats
} from './subcategories';

// Types
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