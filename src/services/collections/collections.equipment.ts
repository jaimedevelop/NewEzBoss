// src/services/collections/collections.equipment.ts
import {
    collection,
    query,
    where,
    getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { DatabaseResult } from './collections.types';

const EQUIPMENT_COLLECTION = 'equipment_items';

/**
 * Get equipment items for collection tabs by IDs
 * Pure fetching - no selection logic
 */
export const getEquipmentForCollectionTabs = async (
    equipmentIds: string[]
): Promise<DatabaseResult<any[]>> => {
    try {
        if (equipmentIds.length === 0) {
            return { success: true, data: [] };
        }

        // Firestore 'in' queries limited to 10 items, so batch them
        const batches: string[][] = [];
        for (let i = 0; i < equipmentIds.length; i += 10) {
            batches.push(equipmentIds.slice(i, i + 10));
        }

        const allEquipment: any[] = [];

        for (const batch of batches) {
            const q = query(
                collection(db, EQUIPMENT_COLLECTION),
                where('__name__', 'in', batch)
            );

            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                const docData = doc.data();
                allEquipment.push({
                    id: doc.id,
                    ...docData,
                    subcategory: docData.subcategoryName || docData.subcategory || '',
                });
            });
        }

        return { success: true, data: allEquipment };
    } catch (error) {
        console.error('❌ Error fetching equipment:', error);
        return { success: false, error };
    }
};