// src/services/inventory/equipment/index.ts

/**
 * Equipment Services - Barrel Export
 * 
 * Modular structure for equipment management:
 * - equipment.types.ts: TypeScript interfaces and types
 * - equipment.queries.ts: READ operations
 * - equipment.mutations.ts: WRITE operations
 * - sections.ts: Equipment sections (Level 2)
 * - categories.ts: Equipment categories (Level 3)
 * - subcategories.ts: Equipment subcategories (Level 4)
 */

// ✅ Queries - READ operations
export {
  getEquipment,
  getEquipmentItem,
  getEquipmentByTrade,
  getAvailableEquipment,
  getRentedEquipment,
  getOwnedEquipment
} from './equipment.queries';

// ✅ Mutations - WRITE operations (only export what exists)
export {
  createEquipmentItem,
  updateEquipmentItem,
  deleteEquipmentItem
} from './equipment.mutations';

// ✅ Sections (Level 2)
export {
  getEquipmentSections,
  addEquipmentSection,
  updateEquipmentSectionName,
  deleteEquipmentSectionWithChildren,
  getEquipmentSectionUsageStats
} from './sections';

// ✅ Categories (Level 3)
export {
  getEquipmentCategories,
  addEquipmentCategory,
  updateEquipmentCategoryName,
  deleteEquipmentCategoryWithChildren,
  getEquipmentCategoryUsageStats
} from './categories';

// ✅ Subcategories (Level 4)
export {
  getEquipmentSubcategories,
  addEquipmentSubcategory,
  updateEquipmentSubcategoryName,
  deleteEquipmentSubcategoryWithChildren,
  getEquipmentSubcategoryUsageStats
} from './subcategories';

// ✅ Types
export type {
  EquipmentItem,
  EquipmentFilters,
  EquipmentResponse,
  PaginatedEquipmentResponse,
  EquipmentSection,
  EquipmentCategory,
  EquipmentSubcategory
} from './equipment.types';

// Import for helper function
import {
  getEquipmentSections,
  addEquipmentSection,
  updateEquipmentSectionName,
  deleteEquipmentSectionWithChildren,
  getEquipmentSectionUsageStats
} from './sections';

import {
  getEquipmentCategories,
  addEquipmentCategory,
  updateEquipmentCategoryName,
  deleteEquipmentCategoryWithChildren,
  getEquipmentCategoryUsageStats
} from './categories';

import {
  getEquipmentSubcategories,
  addEquipmentSubcategory,
  updateEquipmentSubcategoryName,
  deleteEquipmentSubcategoryWithChildren,
  getEquipmentSubcategoryUsageStats
} from './subcategories';

// Helper function for GenericCategoryEditor
export const getEquipmentHierarchyServices = () => ({
  getSections: getEquipmentSections,
  addSection: addEquipmentSection,
  getCategories: getEquipmentCategories,
  addCategory: addEquipmentCategory,
  getSubcategories: getEquipmentSubcategories,
  addSubcategory: addEquipmentSubcategory,
  updateCategoryName: async (categoryId: string, newName: string, level: string, userId: string) => {
    if (level === 'section') {
      return updateEquipmentSectionName(categoryId, newName, userId);
    } else if (level === 'category') {
      return updateEquipmentCategoryName(categoryId, newName, userId);
    } else if (level === 'subcategory') {
      return updateEquipmentSubcategoryName(categoryId, newName, userId);
    }
    return { success: false, error: 'Invalid level' };
  },
  deleteCategoryWithChildren: async (categoryId: string, level: string, userId: string) => {
    if (level === 'section') {
      return deleteEquipmentSectionWithChildren(categoryId, userId);
    } else if (level === 'category') {
      return deleteEquipmentCategoryWithChildren(categoryId, userId);
    } else if (level === 'subcategory') {
      return deleteEquipmentSubcategoryWithChildren(categoryId, userId);
    }
    return { success: false, error: 'Invalid level' };
  },
  getCategoryUsageStats: async (categoryId: string, level: string, userId: string) => {
    if (level === 'section') {
      return getEquipmentSectionUsageStats(categoryId, userId);
    } else if (level === 'category') {
      return getEquipmentCategoryUsageStats(categoryId, userId);
    } else if (level === 'subcategory') {
      return getEquipmentSubcategoryUsageStats(categoryId, userId);
    }
    return { success: false, error: 'Invalid level' };
  }
});