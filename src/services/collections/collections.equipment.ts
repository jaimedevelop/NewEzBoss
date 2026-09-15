// src/services/collections/collections.equipment.ts
import { getEquipmentByIds } from '../inventory/equipment/equipment.queries';
import type { DatabaseResult } from './collections.types';

/**
 * Get equipment items for collection tabs by IDs.
 * Uses the bounded owner-scoped API batch contract.
 */
export const getEquipmentForCollectionTabs = async (
  equipmentIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (equipmentIds.length === 0) {
      return { success: true, data: [] };
    }

    const result = await getEquipmentByIds(equipmentIds);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ Error fetching equipment:', error);
    return { success: false, error };
  }
};
