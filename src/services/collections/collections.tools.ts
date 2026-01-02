// src/services/collections/collections.tools.ts
import {
    collection,
    query,
    where,
    getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { DatabaseResult } from './collections.types';

const TOOLS_COLLECTION = 'tool_items';

/**
 * Get tool items for collection tabs by IDs
 * Pure fetching - no selection logic
 */
export const getToolsForCollectionTabs = async (
    toolIds: string[]
): Promise<DatabaseResult<any[]>> => {
    try {
        if (toolIds.length === 0) {
            return { success: true, data: [] };
        }

        // Firestore 'in' queries limited to 10 items, so batch them
        const batches: string[][] = [];
        for (let i = 0; i < toolIds.length; i += 10) {
            batches.push(toolIds.slice(i, i + 10));
        }

        const allTools: any[] = [];

        for (const batch of batches) {
            const q = query(
                collection(db, TOOLS_COLLECTION),
                where('__name__', 'in', batch)
            );

            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                const docData = doc.data();
                allTools.push({
                    id: doc.id,
                    ...docData,
                    subcategory: docData.subcategoryName || docData.subcategory || '',
                });
            });
        }

        return { success: true, data: allTools };
    } catch (error) {
        console.error('❌ Error fetching tools:', error);
        return { success: false, error };
    }
};