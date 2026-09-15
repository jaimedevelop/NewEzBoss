// src/services/collections/collections.tools.ts
import { getToolsByIds } from '../inventory/tools/tool.queries';
import type { DatabaseResult } from './collections.types';

/**
 * Get tool items for collection tabs by IDs.
 * Uses the bounded owner-scoped API batch contract.
 */
export const getToolsForCollectionTabs = async (
  toolIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (toolIds.length === 0) {
      return { success: true, data: [] };
    }

    const result = await getToolsByIds(toolIds);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ Error fetching tools:', error);
    return { success: false, error };
  }
};
