// src/services/inventory/labor/categories.ts
// Adapts the shared Postgres category hierarchy to the Labor-prefixed shape the
// Labor UI expects. See tools/categories.ts for the equivalent adapter for Tools.
// Labor's hierarchy stops at category — no subcategory level (see 003_inventory.sql).
import {
  createHierarchyNode,
  deleteHierarchyNode,
  errorMessage,
  getHierarchyUsage,
  listHierarchy,
  renameHierarchyNode,
} from '../../categories/hierarchyApi';
import type { LaborResponse } from './labor.types';

export interface LaborCategory {
  id?: string;
  name: string;
  sectionId: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

export const getCategories = async (
  sectionId: string,
  _userId: string
): Promise<LaborResponse<LaborCategory[]>> => {
  try {
    const rows = await listHierarchy('category', 'labor', sectionId);
    const categories: LaborCategory[] = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      sectionId: String(r.sectionId),
      tradeId: '',
      userId: String(r.userId),
      createdAt: r.createdAt,
    }));
    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting labor categories:', error);
    return { success: false, error: errorMessage(error, 'Failed to load categories') };
  }
};

export const addCategory = async (
  name: string,
  sectionId: string,
  _tradeId: string,
  _userId: string
): Promise<LaborResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Category name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Category name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('category', 'labor', name.trim(), sectionId);
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error adding labor category:', error);
    return { success: false, error: errorMessage(error, 'Failed to create category') };
  }
};

export const updateCategoryName = async (
  categoryId: string,
  newName: string,
  _userId: string
): Promise<LaborResponse<void>> => {
  try {
    await renameHierarchyNode('category', categoryId, newName);
    return { success: true };
  } catch (error) {
    console.error('Error updating labor category:', error);
    return { success: false, error: errorMessage(error, 'Failed to update category') };
  }
};

export const deleteCategoryWithChildren = async (
  categoryId: string,
  _userId: string
): Promise<LaborResponse<void>> => {
  try {
    await deleteHierarchyNode('category', categoryId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting labor category:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete category') };
  }
};

export const getCategoryUsageStats = async (
  categoryId: string,
  _userId: string
): Promise<LaborResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const usage = await getHierarchyUsage('category', categoryId);
    return {
      success: true,
      data: {
        // Labor has no subcategory level.
        categoryCount: 0,
        itemCount: usage.itemCounts.inventoryLabor ?? 0,
      },
    };
  } catch (error) {
    console.error('Error getting labor category usage stats:', error);
    return { success: false, error: errorMessage(error, 'Failed to get usage statistics') };
  }
};
