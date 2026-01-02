// ============================================================
// 🚧 TEMPORARY SERVICE - ACCOUNTING SECTION - TO BE MOVED LATER 🚧
// ============================================================
// src/services/collections/collections.calculations.ts

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { CollectionCalculation, CollectionResponse } from './collections.types';

const COLLECTION_NAME = 'collections';

/**
 * Save calculator data to a collection
 * @param collectionId - Collection ID
 * @param calculation - Calculator data
 * @returns Promise with success/error
 */
export const saveCollectionCalculation = async (
  collectionId: string,
  calculation: CollectionCalculation
): Promise<CollectionResponse<void>> => {
  try {
    const collectionRef = doc(db, COLLECTION_NAME, collectionId);

    await updateDoc(collectionRef, {
      calculations: calculation,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Calculator saved successfully:', collectionId);

    return { success: true };
  } catch (error) {
    console.error('❌ Error saving calculator:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save calculator'
    };
  }
};

/**
 * Clear calculator data from a collection
 * @param collectionId - Collection ID
 * @returns Promise with success/error
 */
export const clearCollectionCalculation = async (
  collectionId: string
): Promise<CollectionResponse<void>> => {
  try {
    const collectionRef = doc(db, COLLECTION_NAME, collectionId);

    await updateDoc(collectionRef, {
      calculations: null,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Calculator cleared successfully:', collectionId);

    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing calculator:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear calculator'
    };
  }
};

// ============================================================
// 🚧 END TEMPORARY SERVICE - ACCOUNTING SECTION 🚧
// ============================================================