// src/services/inventory/tools/categories.ts
// Adapts the shared Postgres category hierarchy to the Tool-prefixed shape
// the Tools UI expects. See sections.ts for why this hierarchy is now shared.
import {
  createHierarchyNode,
  deleteHierarchyNode,
  errorMessage,
  getHierarchyUsage,
  listHierarchy,
  renameHierarchyNode,
} from '../../categories/hierarchyApi';
import { ToolResponse, ToolCategory } from './tool.types';

export const getToolCategories = async (
  sectionId: string,
  _userId: string
): Promise<ToolResponse<ToolCategory[]>> => {
  try {
    const rows = await listHierarchy('category', sectionId);
    const categories: ToolCategory[] = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      sectionId: String(r.sectionId),
      tradeId: '',
      userId: String(r.userId),
      createdAt: r.createdAt,
    }));
    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting tool categories:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch tool categories') };
  }
};

export const addToolCategory = async (
  name: string,
  sectionId: string,
  _tradeId: string,
  _userId: string
): Promise<ToolResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Category name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Category name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('category', name.trim(), sectionId);
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error adding tool category:', error);
    return { success: false, error: errorMessage(error, 'Failed to add tool category') };
  }
};

export const updateToolCategoryName = async (
  categoryId: string,
  newName: string,
  _userId: string
): Promise<ToolResponse<void>> => {
  try {
    await renameHierarchyNode('category', categoryId, newName);
    return { success: true };
  } catch (error) {
    console.error('Error updating tool category:', error);
    return { success: false, error: errorMessage(error, 'Failed to update tool category') };
  }
};

export const deleteToolCategoryWithChildren = async (
  categoryId: string,
  _userId: string
): Promise<ToolResponse<void>> => {
  try {
    await deleteHierarchyNode('category', categoryId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting tool category:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete tool category') };
  }
};

export const getToolCategoryUsageStats = async (
  categoryId: string,
  _userId: string
): Promise<ToolResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const usage = await getHierarchyUsage('category', categoryId);
    return {
      success: true,
      data: {
        categoryCount: usage.descendantCounts.subcategory ?? 0,
        itemCount: usage.itemCounts.inventoryTools ?? 0,
      },
    };
  } catch (error) {
    console.error('Error getting tool category usage stats:', error);
    return { success: false, error: errorMessage(error, 'Failed to get usage statistics') };
  }
};
