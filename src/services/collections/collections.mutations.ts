// src/services/collections/collections.mutations.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getCollection } from './collections.queries';
import type { Collection, DatabaseResult, CategorySelection, CategoryTab, ItemSelection } from './collections.types';
const COLLECTIONS_COLLECTION = 'collections';

/**
 * Create a new collection
 */
export const createCollection = async (
  collectionData: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DatabaseResult> => {
  try {
    // Validate required fields
    if (!collectionData.name || !collectionData.category) {
      return { success: false, error: 'Name and category are required' };
    }

    // Ensure all type-specific fields have defaults
    const dataWithDefaults = {
      ...collectionData,
      taxRate: collectionData.taxRate ?? 0.07,
      productCategoryTabs: collectionData.productCategoryTabs || [],
      laborCategoryTabs: collectionData.laborCategoryTabs || [],
      toolCategoryTabs: collectionData.toolCategoryTabs || [],
      equipmentCategoryTabs: collectionData.equipmentCategoryTabs || [],
      productSelections: collectionData.productSelections || {},
      laborSelections: collectionData.laborSelections || {},
      toolSelections: collectionData.toolSelections || {},
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
    console.error('Error creating collection:', error);
    return { success: false, error };
  }
};

/**
 * Update an existing collection
 */
export const updateCollection = async (
  collectionId: string,
  collectionData: Partial<Collection>
): Promise<DatabaseResult> => {
  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    
    // Remove id from update data if present
    const { id, ...dataToUpdate } = collectionData;
    
    await updateDoc(docRef, {
      ...dataToUpdate,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating collection:', error);
    return { success: false, error };
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
    console.error('Error deleting collection:', error);
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
    // Get the original collection
    const originalResult = await getCollection(collectionId);
    if (!originalResult.success || !originalResult.data) {
      return { success: false, error: 'Original collection not found' };
    }

    const original = originalResult.data;
    
    // Create new collection data
    const duplicatedData: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> = {
      name: newName || `${original.name} (Copy)`,
      category: original.category,
      description: original.description,
      estimatedHours: original.estimatedHours,
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
    console.error('Error duplicating collection:', error);
    return { success: false, error };
  }
};

/**
 * Update collection name and description
 */
export const updateCollectionMetadata = async (
  collectionId: string,
  metadata: {
    name?: string;
    description?: string;
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
    console.error('Error updating collection metadata:', error);
    return { success: false, error };
  }
};

/**
 * Update the tax rate for a collection
 */
export const updateCollectionTaxRate = async (
  collectionId: string,
  taxRate: number
): Promise<DatabaseResult> => {
  try {
    // Validate tax rate (0-1 decimal format)
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
    console.error('Error updating tax rate:', error);
    return { success: false, error };
  }
};

/**
 * Batch operations for collections
 */
export const batchUpdateCollections = async (
  updates: Array<{ id: string; data: Partial<Collection> }>
): Promise<DatabaseResult> => {
  try {
    const batch = writeBatch(db);

    updates.forEach(({ id, data }) => {
      const docRef = doc(db, COLLECTIONS_COLLECTION, id);
      const { id: dataId, ...updateData } = data;
      batch.update(docRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error batch updating collections:', error);
    return { success: false, error };
  }
};

/**
 * Update collection categories and product selections
 * Used when editing collection categories after creation
 */
export const updateCollectionCategories = async (
  collectionId: string,
  updates: {
    categorySelection: CategorySelection;
    productCategoryTabs: CategoryTab[];  // ✅ Correct name
    productSelections: Record<string, ItemSelection>;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const collectionRef = doc(db, 'collections', collectionId);
    
    await updateDoc(collectionRef, {
      categorySelection: updates.categorySelection,
      productCategoryTabs: updates.productCategoryTabs,  // ✅ Correct field name
      productSelections: updates.productSelections,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating collection categories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update collection categories'
    };
  }
};