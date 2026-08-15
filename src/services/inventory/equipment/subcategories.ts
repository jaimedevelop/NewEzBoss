// src/services/inventory/equipment/subcategories.ts
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
import { EquipmentResponse, EquipmentSubcategory } from './equipment.types';

export const getEquipmentSubcategories = async (
  categoryId: string,
  _userId: string
): Promise<EquipmentResponse<EquipmentSubcategory[]>> => {
  try {
    const rows = await listHierarchy('subcategory', 'equipment', categoryId);
    const subcategories: EquipmentSubcategory[] = rows.map(r => ({
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
    console.error('Error getting equipment subcategories:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch equipment subcategories') };
  }
};

export const addEquipmentSubcategory = async (
  name: string,
  categoryId: string,
  _sectionId: string,
  _tradeId: string,
  _userId: string
): Promise<EquipmentResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Subcategory name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Subcategory name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('subcategory', 'equipment', name.trim(), categoryId);
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error adding equipment subcategory:', error);
    return { success: false, error: errorMessage(error, 'Failed to add equipment subcategory') };
  }
};

export const updateEquipmentSubcategoryName = async (
  subcategoryId: string,
  newName: string,
  _userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    await renameHierarchyNode('subcategory', subcategoryId, newName);
    return { success: true };
  } catch (error) {
    console.error('Error updating equipment subcategory:', error);
    return { success: false, error: errorMessage(error, 'Failed to update equipment subcategory') };
  }
};

export const deleteEquipmentSubcategoryWithChildren = async (
  subcategoryId: string,
  _userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    await deleteHierarchyNode('subcategory', subcategoryId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting equipment subcategory:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete equipment subcategory') };
  }
};

export const getEquipmentSubcategoryUsageStats = async (
  subcategoryId: string,
  _userId: string
): Promise<EquipmentResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const usage = await getHierarchyUsage('subcategory', subcategoryId);
    return {
      success: true,
      data: {
        categoryCount: usage.descendantCounts.type ?? 0,
        itemCount: usage.itemCounts.inventoryEquipment ?? 0,
      },
    };
  } catch (error) {
    console.error('Error getting equipment subcategory usage stats:', error);
    return { success: false, error: errorMessage(error, 'Failed to get usage statistics') };
  }
};
