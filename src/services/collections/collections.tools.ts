// src/services/collections/collections.tools.ts
import { getTools } from '../inventory/tools/tool.queries';
import type { DatabaseResult } from './collections.types';

/**
 * Get tool items for collection tabs by IDs.
 * Backend has no by-IDs endpoint, so this fetches the full tools list
 * (already Postgres-backed) and filters client-side.
 */
export const getToolsForCollectionTabs = async (
  toolIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (toolIds.length === 0) {
      return { success: true, data: [] };
    }

    const idSet = new Set(toolIds.map(String));
    const result = await getTools('');
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.filter((item: any) => idSet.has(String(item.id))) };
  } catch (error) {
    console.error('❌ Error fetching tools:', error);
    return { success: false, error };
  }
};
