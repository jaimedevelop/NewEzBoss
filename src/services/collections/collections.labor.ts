// src/services/collections/collections.labor.ts
import { getLaborItemsByIds } from '../inventory/labor/labor.queries';
import type { DatabaseResult } from './collections.types';

/**
 * Get labor items for collection tabs by IDs.
 * Uses the bounded owner-scoped API batch contract.
 */
export const getLaborItemsForCollectionTabs = async (
  laborIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (laborIds.length === 0) {
      return { success: true, data: [] };
    }

    const result = await getLaborItemsByIds(laborIds);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ Error fetching labor items:', error);
    return { success: false, error };
  }
};
