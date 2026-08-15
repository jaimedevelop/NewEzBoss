// src/services/inventory/equipment/categories.ts
// Adapts the shared Postgres category hierarchy to the Equipment-prefixed shape
// the Equipment UI expects. See sections.ts for why this hierarchy is now shared.
import {
  createHierarchyNode,
  deleteHierarchyNode,
  errorMessage,
  getHierarchyUsage,
  listHierarchy,
  renameHierarchyNode,
} from '../../categories/hierarchyApi';
import { EquipmentResponse, EquipmentCategory } from './equipment.types';

export const getEquipmentCategories = async (
  sectionId: string,
  _userId: string
): Promise<EquipmentResponse<EquipmentCategory[]>> => {
  try {
    const rows = await listHierarchy('category', 'equipment', sectionId);
    const categories: EquipmentCategory[] = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      sectionId: String(r.sectionId),
      tradeId: '',
      userId: String(r.userId),
      createdAt: r.createdAt,
    }));
    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting equipment categories:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch equipment categories') };
  }
};

export const addEquipmentCategory = async (
  name: string,
  sectionId: string,
  _tradeId: string,
  _userId: string
): Promise<EquipmentResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Category name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Category name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('category', 'equipment', name.trim(), sectionId);
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error adding equipment category:', error);
    return { success: false, error: errorMessage(error, 'Failed to add equipment category') };
  }
};

export const updateEquipmentCategoryName = async (
  categoryId: string,
  newName: string,
  _userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    await renameHierarchyNode('category', categoryId, newName);
    return { success: true };
  } catch (error) {
    console.error('Error updating equipment category:', error);
    return { success: false, error: errorMessage(error, 'Failed to update equipment category') };
  }
};

export const deleteEquipmentCategoryWithChildren = async (
  categoryId: string,
  _userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    await deleteHierarchyNode('category', categoryId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting equipment category:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete equipment category') };
  }
};

export const getEquipmentCategoryUsageStats = async (
  categoryId: string,
  _userId: string
): Promise<EquipmentResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const usage = await getHierarchyUsage('category', categoryId);
    return {
      success: true,
      data: {
        categoryCount: usage.descendantCounts.subcategory ?? 0,
        itemCount: usage.itemCounts.inventoryEquipment ?? 0,
      },
    };
  } catch (error) {
    console.error('Error getting equipment category usage stats:', error);
    return { success: false, error: errorMessage(error, 'Failed to get usage statistics') };
  }
};
