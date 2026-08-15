// src/services/inventory/labor/sections.ts
// Adapts the shared Postgres category hierarchy to the Labor-prefixed shape the
// Labor UI expects. See tools/sections.ts for the equivalent adapter for Tools.
import {
  createHierarchyNode,
  deleteHierarchyNode,
  errorMessage,
  getHierarchyUsage,
  listHierarchy,
  renameHierarchyNode,
} from '../../categories/hierarchyApi';
import type { LaborResponse } from './labor.types';

export interface LaborSection {
  id?: string;
  name: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

export const getSections = async (
  tradeId: string,
  _userId: string
): Promise<LaborResponse<LaborSection[]>> => {
  try {
    const rows = await listHierarchy('section', 'labor', tradeId);
    const sections: LaborSection[] = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      tradeId: String(r.tradeId),
      userId: String(r.userId),
      createdAt: r.createdAt,
    }));
    return { success: true, data: sections };
  } catch (error) {
    console.error('Error getting labor sections:', error);
    return { success: false, error: errorMessage(error, 'Failed to load sections') };
  }
};

export const addSection = async (
  name: string,
  tradeId: string,
  _userId: string
): Promise<LaborResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Section name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Section name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('section', 'labor', name.trim(), tradeId);
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error adding labor section:', error);
    return { success: false, error: errorMessage(error, 'Failed to create section') };
  }
};

export const updateSectionName = async (
  sectionId: string,
  newName: string,
  _userId: string
): Promise<LaborResponse<void>> => {
  try {
    await renameHierarchyNode('section', sectionId, newName);
    return { success: true };
  } catch (error) {
    console.error('Error updating labor section:', error);
    return { success: false, error: errorMessage(error, 'Failed to update section') };
  }
};

export const deleteSectionWithChildren = async (
  sectionId: string,
  _userId: string
): Promise<LaborResponse<void>> => {
  try {
    await deleteHierarchyNode('section', sectionId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting labor section:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete section') };
  }
};

export const getSectionUsageStats = async (
  sectionId: string,
  _userId: string
): Promise<LaborResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const usage = await getHierarchyUsage('section', sectionId);
    return {
      success: true,
      data: {
        categoryCount: usage.descendantCounts.category ?? 0,
        itemCount: usage.itemCounts.inventoryLabor ?? 0,
      },
    };
  } catch (error) {
    console.error('Error getting labor section usage stats:', error);
    return { success: false, error: errorMessage(error, 'Failed to get usage statistics') };
  }
};
