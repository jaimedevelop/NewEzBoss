// src/services/collections/collections.equipment.ts
import { getEquipment } from '../inventory/equipment/equipment.queries';
import type { DatabaseResult } from './collections.types';

/**
 * Get equipment items for collection tabs by IDs.
 * Backend has no by-IDs endpoint, so this fetches the full equipment list
 * (already Postgres-backed) and filters client-side.
 */
export const getEquipmentForCollectionTabs = async (
  equipmentIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (equipmentIds.length === 0) {
      return { success: true, data: [] };
    }

    const idSet = new Set(equipmentIds.map(String));
    const result = await getEquipment('');
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.filter((item: any) => idSet.has(String(item.id))) };
  } catch (error) {
    console.error('❌ Error fetching equipment:', error);
    return { success: false, error };
  }
};
