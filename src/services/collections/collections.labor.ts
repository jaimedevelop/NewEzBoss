// src/services/collections/collections.labor.ts
import {
    collection,
    query,
    where,
    getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { DatabaseResult } from './collections.types';

const LABOR_COLLECTION = 'labor_items';

/**
 * Get labor items for collection tabs by IDs
 * Pure fetching - no selection logic
 */
export const getLaborItemsForCollectionTabs = async (
    laborIds: string[]
): Promise<DatabaseResult<any[]>> => {
    try {
        if (laborIds.length === 0) {
            return { success: true, data: [] };
        }

        // Firestore 'in' queries limited to 10 items, so batch them
        const batches: string[][] = [];
        for (let i = 0; i < laborIds.length; i += 10) {
            batches.push(laborIds.slice(i, i + 10));
        }

        // Execute all batch queries in parallel for better performance
        const batchPromises = batches.map(async (batch) => {
            const q = query(
                collection(db, LABOR_COLLECTION),
                where('__name__', 'in', batch)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });

        const batchResults = await Promise.all(batchPromises);
        const allLabor = batchResults.flat();

        return { success: true, data: allLabor };
    } catch (error) {
        console.error('❌ Error fetching labor items:', error);
        return { success: false, error };
    }
};