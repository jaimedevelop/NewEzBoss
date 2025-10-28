// Types
export type {
  LaborItem,
  FlatRate,
  HourlyRate,
  Task,
  LaborFilters,
  LaborResponse,
  PaginatedLaborResponse
} from './labor.types';

// Queries
export {
  getLaborItem,
  getLaborItems,
  getLaborItemsByTrade,
  getActiveLaborItems
} from './labor.queries';

// Mutations
export {
  createLaborItem,
  updateLaborItem,
  deleteLaborItem,
  toggleLaborItemStatus
} from './labor.mutations';

// Sections
export {
  getSections,
  addSection,
  updateSectionName,
  deleteSectionWithChildren,
  getSectionUsageStats
} from './sections';

export type { LaborSection } from './sections';

// Categories
export {
  getCategories,
  addCategory,
  updateCategoryName,
  deleteCategoryWithChildren,
  getCategoryUsageStats
} from './categories';

export type { LaborCategory } from './categories';

// Re-export productTrades for convenience
export { getProductTrades } from '../../categories/trades';
export type { ProductTrade } from '../../categories/trades';

// Import everything we need for the helper function
import {
  getSections,
  addSection,
  updateSectionName,
  deleteSectionWithChildren,
  getSectionUsageStats
} from './sections';

import {
  getCategories,
  addCategory,
  updateCategoryName,
  deleteCategoryWithChildren,
  getCategoryUsageStats
} from './categories';

// Helper function to wrap services for GenericCategoryEditor
export const getLaborHierarchyServices = () => ({
  getSections,
  addSection,
  getCategories,
  addCategory,
  updateCategoryName: async (categoryId: string, newName: string, level: string, userId: string) => {
    if (level === 'section') {
      return updateSectionName(categoryId, newName, userId);
    } else if (level === 'category') {
      return updateCategoryName(categoryId, newName, userId);
    }
    return { success: false, error: 'Invalid level' };
  },
  deleteCategoryWithChildren: async (categoryId: string, level: string, userId: string) => {
    if (level === 'section') {
      return deleteSectionWithChildren(categoryId, userId);
    } else if (level === 'category') {
      return deleteCategoryWithChildren(categoryId, userId);
    }
    return { success: false, error: 'Invalid level' };
  },
  getCategoryUsageStats: async (categoryId: string, level: string, userId: string) => {
    if (level === 'section') {
      return getSectionUsageStats(categoryId, userId);
    } else if (level === 'category') {
      return getCategoryUsageStats(categoryId, userId);
    }
    return { success: false, error: 'Invalid level' };
  }
});