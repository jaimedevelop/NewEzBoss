// src/services/inventory/equipment/sections.ts
//
// Equipment no longer has its own section collection — it uses the shared
// trades → sections → categories → subcategories hierarchy in Postgres
// (see 003_inventory.sql / inventoryCategories.ts on the API), same as
// products, tools, and labor. This module just adapts that shared
// hierarchy to the Equipment-prefixed shape the rest of the Equipment UI expects.
import {
  createHierarchyNode,
  deleteHierarchyNode,
  errorMessage,
  getHierarchyUsage,
  listHierarchy,
  renameHierarchyNode,
} from '../../categories/hierarchyApi';
import { EquipmentResponse, EquipmentSection } from './equipment.types';

export const getEquipmentSections = async (
  tradeId: string,
  _userId: string
): Promise<EquipmentResponse<EquipmentSection[]>> => {
  try {
    const rows = await listHierarchy('section', 'equipment', tradeId);
    const sections: EquipmentSection[] = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      tradeId: String(r.tradeId),
      userId: String(r.userId),
      createdAt: r.createdAt,
    }));
    return { success: true, data: sections };
  } catch (error) {
    console.error('Error getting equipment sections:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch equipment sections') };
  }
};

export const addEquipmentSection = async (
  name: string,
  tradeId: string,
  _userId: string
): Promise<EquipmentResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Section name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Section name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('section', 'equipment', name.trim(), tradeId);
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error adding equipment section:', error);
    return { success: false, error: errorMessage(error, 'Failed to add equipment section') };
  }
};

export const updateEquipmentSectionName = async (
  sectionId: string,
  newName: string,
  _userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    await renameHierarchyNode('section', sectionId, newName);
    return { success: true };
  } catch (error) {
    console.error('Error updating equipment section:', error);
    return { success: false, error: errorMessage(error, 'Failed to update equipment section') };
  }
};

// Children (categories/subcategories) and any inventory rows referencing this section
// cascade/null-out via Postgres FKs — see inventoryCategories.ts on the API.
export const deleteEquipmentSectionWithChildren = async (
  sectionId: string,
  _userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    await deleteHierarchyNode('section', sectionId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting equipment section:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete equipment section') };
  }
};

export const getEquipmentSectionUsageStats = async (
  sectionId: string,
  _userId: string
): Promise<EquipmentResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const usage = await getHierarchyUsage('section', sectionId);
    return {
      success: true,
      data: {
        categoryCount: usage.descendantCounts.category ?? 0,
        itemCount: usage.itemCounts.inventoryEquipment ?? 0,
      },
    };
  } catch (error) {
    console.error('Error getting equipment section usage stats:', error);
    return { success: false, error: errorMessage(error, 'Failed to get usage statistics') };
  }
};
