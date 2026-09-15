import type { DatabaseResult, CategoryUsageStats } from './types';
import { renameHierarchyNode, deleteHierarchyNode, getHierarchyUsage, totalItemCount, errorMessage, type HierarchyLevel } from './hierarchyApi';

export async function updateCategoryName(categoryId: string, newName: string, level: HierarchyLevel, _userId: string): Promise<DatabaseResult> {
  if (!newName.trim()) return { success: false, error: 'Name cannot be empty' };
  if (newName.length > 30) return { success: false, error: 'Name must be 30 characters or less' };
  try {
    await renameHierarchyNode(level, categoryId, newName.trim());
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to rename category') };
  }
}

export async function getCategoryUsageStats(categoryId: string, level: HierarchyLevel, _userId: string): Promise<DatabaseResult<CategoryUsageStats>> {
  try {
    const usage = await getHierarchyUsage(level, categoryId);
    return { success: true, data: {
      categoryCount: Object.values(usage.descendantCounts).reduce((sum, count) => sum + count, 0),
      productCount: totalItemCount(usage), affectedCategories: [],
    } };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to load category usage') };
  }
}

/** Descendants cascade in SQL; existing inventory references can block deletion. */
export async function deleteCategoryWithChildren(categoryId: string, level: HierarchyLevel, _userId: string): Promise<DatabaseResult> {
  try {
    await deleteHierarchyNode(level, categoryId);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to delete category') };
  }
}
