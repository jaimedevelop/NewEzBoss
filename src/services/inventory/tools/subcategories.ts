// src/services/inventory/tools/subcategories.ts
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
import { ToolResponse, ToolSubcategory } from './tool.types';

export const getToolSubcategories = async (
  categoryId: string,
  _userId: string
): Promise<ToolResponse<ToolSubcategory[]>> => {
  try {
    const rows = await listHierarchy('subcategory', 'tool', categoryId);
    const subcategories: ToolSubcategory[] = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      categoryId: String(r.categoryId),
      sectionId: '',
      tradeId: '',
      userId: String(r.userId),
      createdAt: r.createdAt,
    }));
    return { success: true, data: subcategories };
  } catch (error) {
    console.error('Error getting tool subcategories:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch tool subcategories') };
  }
};

export const addToolSubcategory = async (
  name: string,
  categoryId: string,
  _sectionId: string,
  _tradeId: string,
  _userId: string
): Promise<ToolResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Subcategory name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Subcategory name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('subcategory', 'tool', name.trim(), categoryId);
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error adding tool subcategory:', error);
    return { success: false, error: errorMessage(error, 'Failed to add tool subcategory') };
  }
};

export const updateToolSubcategoryName = async (
  subcategoryId: string,
  newName: string,
  _userId: string
): Promise<ToolResponse<void>> => {
  try {
    await renameHierarchyNode('subcategory', subcategoryId, newName);
    return { success: true };
  } catch (error) {
    console.error('Error updating tool subcategory:', error);
    return { success: false, error: errorMessage(error, 'Failed to update tool subcategory') };
  }
};

export const deleteToolSubcategoryWithChildren = async (
  subcategoryId: string,
  _userId: string
): Promise<ToolResponse<void>> => {
  try {
    await deleteHierarchyNode('subcategory', subcategoryId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting tool subcategory:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete tool subcategory') };
  }
};

export const getToolSubcategoryUsageStats = async (
  subcategoryId: string,
  _userId: string
): Promise<ToolResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const usage = await getHierarchyUsage('subcategory', subcategoryId);
    return {
      success: true,
      data: {
        categoryCount: usage.descendantCounts.type ?? 0,
        itemCount: usage.itemCounts.inventoryTools ?? 0,
      },
    };
  } catch (error) {
    console.error('Error getting tool subcategory usage stats:', error);
    return { success: false, error: errorMessage(error, 'Failed to get usage statistics') };
  }
};
