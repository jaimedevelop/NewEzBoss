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
        console.log(`🔍 [getEquipmentForCollectionTabs] Fetching ${equipmentIds.length} items`, equipmentIds);

        if (equipmentIds.length === 0) {
            return { success: true, data: [] };
        }

        // Firestore 'in' queries limited to 10 items, so batch them
        const batches: string[][] = [];
        for (let i = 0; i < equipmentIds.length; i += 10) {
            batches.push(equipmentIds.slice(i, i + 10));
        }

        // Execute all batch queries in parallel for better performance
        const batchPromises = batches.map(async (batch, index) => {
            console.log(`📦 [getEquipmentForCollectionTabs] Batch ${index + 1}/${batches.length}`, batch);
            const q = query(
                collection(db, EQUIPMENT_COLLECTION),
                where('__name__', 'in', batch)
            );

            const snapshot = await getDocs(q);
            console.log(`✅ [getEquipmentForCollectionTabs] Batch ${index + 1} returned ${snapshot.size} docs`);

            return snapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    subcategory: docData.subcategoryName || docData.subcategory || '',
                    // Ensure hierarchy fields are present if available in doc
                    tradeName: docData.tradeName,
                    sectionName: docData.sectionName,
                    categoryName: docData.categoryName,
                };
            });
        });

        const batchResults = await Promise.all(batchPromises);
        const allEquipment = batchResults.flat();

        console.log(`📊 [getEquipmentForCollectionTabs] Total items fetched: ${allEquipment.length} / ${equipmentIds.length}`);

        return { success: true, data: allEquipment };
    } catch (error) {
        console.error('❌ Error fetching equipment:', error);
        return { success: false, error };
    }
};