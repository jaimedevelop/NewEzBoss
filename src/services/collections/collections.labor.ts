// src/services/collections/collections.labor.ts
import { getLaborItems } from '../inventory/labor/labor.queries';
import type { DatabaseResult } from './collections.types';

/**
 * Get labor items for collection tabs by IDs.
 * Backend has no by-IDs endpoint, so this fetches the full labor list
 * (already Postgres-backed) and filters client-side.
 */
export const getLaborItemsForCollectionTabs = async (
  laborIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (laborIds.length === 0) {
      return { success: true, data: [] };
    }

    const idSet = new Set(laborIds.map(String));
    const result = await getLaborItems('');
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.filter((item: any) => idSet.has(String(item.id))) };
  } catch (error) {
    console.error('❌ Error fetching labor items:', error);
    return { success: false, error };
  }
};
