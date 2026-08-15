// src/services/inventory/tools/sections.ts
//
// Tools no longer has its own section collection — it uses the shared
// trades → sections → categories → subcategories hierarchy in Postgres
// (see 003_inventory.sql / inventoryCategories.ts on the API), same as
// products, equipment, and labor. This module just adapts that shared
// hierarchy to the Tool-prefixed shape the rest of the Tools UI expects.
import {
  createHierarchyNode,
  deleteHierarchyNode,
  errorMessage,
  getHierarchyUsage,
  listHierarchy,
  renameHierarchyNode,
} from '../../categories/hierarchyApi';
import { ToolResponse, ToolSection } from './tool.types';

export const getToolSections = async (
  tradeId: string,
  _userId: string
): Promise<ToolResponse<ToolSection[]>> => {
  try {
    const rows = await listHierarchy('section', tradeId);
    const sections: ToolSection[] = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      tradeId: String(r.tradeId),
      userId: String(r.userId),
      createdAt: r.createdAt,
    }));
    return { success: true, data: sections };
  } catch (error) {
    console.error('Error getting tool sections:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch tool sections') };
  }
};

export const addToolSection = async (
  name: string,
  tradeId: string,
  _userId: string
): Promise<ToolResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Section name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Section name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('section', name.trim(), tradeId);
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error adding tool section:', error);
    return { success: false, error: errorMessage(error, 'Failed to add tool section') };
  }
};

export const updateToolSectionName = async (
  sectionId: string,
  newName: string,
  _userId: string
): Promise<ToolResponse<void>> => {
  try {
    await renameHierarchyNode('section', sectionId, newName);
    return { success: true };
  } catch (error) {
    console.error('Error updating tool section:', error);
    return { success: false, error: errorMessage(error, 'Failed to update tool section') };
  }
};

// Children (categories/subcategories) and any inventory rows referencing this section
// cascade/null-out via Postgres FKs — see inventoryCategories.ts on the API.
export const deleteToolSectionWithChildren = async (
  sectionId: string,
  _userId: string
): Promise<ToolResponse<void>> => {
  try {
    await deleteHierarchyNode('section', sectionId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting tool section:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete tool section') };
  }
};

export const getToolSectionUsageStats = async (
  sectionId: string,
  _userId: string
): Promise<ToolResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const usage = await getHierarchyUsage('section', sectionId);
    return {
      success: true,
      data: {
        categoryCount: usage.descendantCounts.category ?? 0,
        itemCount: usage.itemCounts.inventoryTools ?? 0,
      },
    };
  } catch (error) {
    console.error('Error getting tool section usage stats:', error);
    return { success: false, error: errorMessage(error, 'Failed to get usage statistics') };
  }
};
