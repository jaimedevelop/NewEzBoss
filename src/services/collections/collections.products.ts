// src/services/collections/collections.products.ts
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { DatabaseResult } from './collections.types';

const PRODUCTS_COLLECTION = 'products';

/**
 * Get products for collection tabs by IDs
 * Pure fetching - no selection logic
 */
export const getProductsForCollectionTabs = async (
  productIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (productIds.length === 0) {
      return { success: true, data: [] };
    }

    // Firestore 'in' queries limited to 10 items, so batch them
    const batches: string[][] = [];
    for (let i = 0; i < productIds.length; i += 10) {
      batches.push(productIds.slice(i, i + 10));
    }

    // Execute all batch queries in parallel for better performance
    const batchPromises = batches.map(async (batch) => {
      const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where('__name__', 'in', batch)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    const batchResults = await Promise.all(batchPromises);
    const allProducts = batchResults.flat();

    return { success: true, data: allProducts };
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    return { success: false, error };
  }
};