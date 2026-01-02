// src/services/collections/collections.mutations.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Collection, DatabaseResult } from './collections.types';

const COLLECTIONS_COLLECTION = 'collections';

/**
 * Create a new collection with default values
 */
export const createCollection = async (
  collectionData: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DatabaseResult> => {
  try {
    // Validate required fields
    if (!collectionData.name || !collectionData.category) {
      return { success: false, error: 'Name and category are required' };
    }

    // Ensure all fields have defaults
    const dataWithDefaults = {
      name: collectionData.name,
      category: collectionData.category,
      description: collectionData.description || '',
      estimatedHours: collectionData.estimatedHours ?? 0,
      taxRate: collectionData.taxRate ?? 0.07,
      userId: collectionData.userId,

      // Category metadata
      categorySelection: collectionData.categorySelection || {
        trade: '',
        sections: [],
        categories: [],
        subcategories: [],
        types: [],
        description: ''
      },

      // Products
      productCategoryTabs: collectionData.productCategoryTabs || [],
      productSelections: collectionData.productSelections || {},

      // Labor
      laborCategoryTabs: collectionData.laborCategoryTabs || [],
      laborSelections: collectionData.laborSelections || {},

      // Tools
      toolCategoryTabs: collectionData.toolCategoryTabs || [],
      toolSelections: collectionData.toolSelections || {},

      // Equipment
      equipmentCategoryTabs: collectionData.equipmentCategoryTabs || [],
      equipmentSelections: collectionData.equipmentSelections || {},

      assignedProducts: collectionData.assignedProducts || [],
    };

    const docRef: DocumentReference = await addDoc(
      collection(db, COLLECTIONS_COLLECTION),
      {
        ...dataWithDefaults,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ Error creating collection:', error);
    return { success: false, error };
  }
};

/**
 * Update collection metadata (name, description, trade)
 */
export const updateCollectionMetadata = async (
  collectionId: string,
  metadata: {
    name?: string;
    description?: string;
    categorySelection?: any;
  }
): Promise<DatabaseResult> => {
  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);

    await updateDoc(docRef, {
      ...metadata,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Error updating collection metadata:', error);
    return { success: false, error };
  }
};

/**
 * Update collection tax rate
 */
export const updateCollectionTaxRate = async (
  collectionId: string,
  taxRate: number
): Promise<DatabaseResult> => {
  try {
    if (taxRate < 0 || taxRate > 1) {
      return { success: false, error: 'Tax rate must be between 0 and 1 (0% to 100%)' };
    }

    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);

    await updateDoc(docRef, {
      taxRate,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Error updating tax rate:', error);
    return { success: false, error };
  }
};

/**
 * MASTER SAVE FUNCTION
 * Saves all changes for a specific content type to Firebase
 */
export const saveCollectionChanges = async (
  collectionId: string,
  updates: {
    productCategoryTabs?: any[];
    productSelections?: Record<string, any>;
    laborCategoryTabs?: any[];
    laborSelections?: Record<string, any>;
    toolCategoryTabs?: any[];
    toolSelections?: Record<string, any>;
    equipmentCategoryTabs?: any[];
    equipmentSelections?: Record<string, any>;
    categorySelection?: any;
  }
): Promise<DatabaseResult> => {
  try {
    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);

    console.log('💾 ========== SAVING TO FIREBASE ==========');
    console.log('💾 Collection ID:', collectionId);
    console.log('💾 Updates:', updates);

    // Write to Firebase (empty arrays are explicitly included)
    const dataToSave = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    await updateDoc(collectionRef, dataToSave);

    console.log('✅ Firebase write completed');

    // ✅ VERIFICATION: Read back to confirm
    const verifyDoc = await getDoc(collectionRef);
    if (verifyDoc.exists()) {
      const verifyData = verifyDoc.data();
      console.log('🔍 ========== VERIFICATION ==========');
      console.log('🔍 productCategoryTabs in DB:', verifyData.productCategoryTabs);
      console.log('🔍 productSelections in DB:', verifyData.productSelections);
      console.log('🔍 laborCategoryTabs in DB:', verifyData.laborCategoryTabs);
      console.log('🔍 laborSelections in DB:', verifyData.laborSelections);
      console.log('🔍 toolCategoryTabs in DB:', verifyData.toolCategoryTabs);
      console.log('🔍 toolSelections in DB:', verifyData.toolSelections);
      console.log('🔍 equipmentCategoryTabs in DB:', verifyData.equipmentCategoryTabs);
      console.log('🔍 equipmentSelections in DB:', verifyData.equipmentSelections);
      console.log('🔍 categorySelection in DB:', verifyData.categorySelection);
      console.log('🔍 ====================================');
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error saving collection changes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save collection changes'
    };
  }
};

/**
 * Delete a collection
 */
export const deleteCollection = async (
  collectionId: string
): Promise<DatabaseResult> => {
  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting collection:', error);
    return { success: false, error };
  }
};

/**
 * Duplicate a collection
 */
export const duplicateCollection = async (
  collectionId: string,
  newName?: string
): Promise<DatabaseResult> => {
  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Original collection not found' };
    }

    const original = docSnap.data() as Collection;

    const duplicatedData: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> = {
      name: newName || `${original.name} (Copy)`,
      category: original.category,
      description: original.description,
      estimatedHours: original.estimatedHours ?? 0,
      categorySelection: original.categorySelection,
      assignedProducts: original.assignedProducts || [],
      productCategoryTabs: original.productCategoryTabs || [],
      laborCategoryTabs: original.laborCategoryTabs || [],
      toolCategoryTabs: original.toolCategoryTabs || [],
      equipmentCategoryTabs: original.equipmentCategoryTabs || [],
      productSelections: original.productSelections || {},
      laborSelections: original.laborSelections || {},
      toolSelections: original.toolSelections || {},
      equipmentSelections: original.equipmentSelections || {},
      taxRate: original.taxRate,
      userId: original.userId,
    };

    return await createCollection(duplicatedData);
  } catch (error) {
    console.error('❌ Error duplicating collection:', error);
    return { success: false, error };
  }
};