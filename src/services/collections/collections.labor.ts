// src/services/collections/collections.labor.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { 
  ItemSelection, 
  CategoryTab, 
  DatabaseResult,
  Collection 
} from './collections.types';

const COLLECTIONS_COLLECTION = 'collections';
const LABOR_COLLECTION = 'labor_items';

/**
 * Update a single labor selection
 */
export const updateLaborSelection = async (
  collectionId: string,
  laborId: string,
  selection: Partial<ItemSelection>
): Promise<DatabaseResult> => {
  try {
    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);

    if (!collectionSnap.exists()) {
      return { success: false, error: 'Collection not found' };
    }

    const currentData = collectionSnap.data() as Collection;
    const laborSelections = { ...(currentData.laborSelections || {}) };
    
    laborSelections[laborId] = {
      ...laborSelections[laborId],
      ...selection,
      addedAt: selection.addedAt || Date.now(),
    };

    if (!selection.isSelected || (selection.quantity !== undefined && selection.quantity <= 0)) {
      delete laborSelections[laborId];
    }

    await updateDoc(collectionRef, {
      laborSelections,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating labor selection:', error);
    return { success: false, error };
  }
};

/**
 * Batch update multiple labor selections
 */
export const batchUpdateLaborSelections = async (
  collectionId: string,
  selections: Record<string, Partial<ItemSelection>>
): Promise<DatabaseResult> => {
  try {
    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);

    if (!collectionSnap.exists()) {
      return { success: false, error: 'Collection not found' };
    }

    const currentData = collectionSnap.data() as Collection;
    const laborSelections = { ...(currentData.laborSelections || {}) };
    
    Object.entries(selections).forEach(([laborId, selection]) => {
      if (!selection.isSelected || (selection.quantity !== undefined && selection.quantity <= 0)) {
        delete laborSelections[laborId];
      } else {
        // ✅ Clean undefined values before merging
        const cleanedSelection = removeUndefinedValues(selection);
        laborSelections[laborId] = {
          ...laborSelections[laborId],
          ...cleanedSelection,
          addedAt: selection.addedAt || Date.now(),
        };
      }
    });

    // ✅ Clean the entire laborSelections object before saving
    const cleanedLaborSelections = removeUndefinedValues(laborSelections);

    await updateDoc(collectionRef, {
      laborSelections: cleanedLaborSelections,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error batch updating labor selections:', error);
    return { success: false, error };
  }
};

/**
 * Get labor items for collection tabs
 */
export const getLaborItemsForCollectionTabs = async (
  laborIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (laborIds.length === 0) {
      return { success: true, data: [] };
    }

    const batches: string[][] = [];
    for (let i = 0; i < laborIds.length; i += 10) {
      batches.push(laborIds.slice(i, i + 10));
    }

    const allLabor: any[] = [];

    for (const batch of batches) {
      const q = query(
        collection(db, LABOR_COLLECTION),
        where('__name__', 'in', batch)
      );
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        allLabor.push({ id: doc.id, ...doc.data() });
      });
    }

    return { success: true, data: allLabor };
  } catch (error) {
    console.error('Error getting labor items for collection tabs:', error);
    return { success: false, error };
  }
};

/**
 * Add a labor category tab to a collection
 */
export const addLaborCategoryTab = async (
  collectionId: string,
  newTab: CategoryTab
): Promise<DatabaseResult> => {
  try {
    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);
    
    if (!collectionSnap.exists()) {
      throw new Error('Collection not found');
    }

    const collection = collectionSnap.data() as Collection;
    
    const existingTab = collection.laborCategoryTabs?.find(
      tab => tab.category === newTab.category && tab.section === newTab.section
    );
    
    if (existingTab) {
      return { 
        success: false, 
        error: 'This category already exists in the collection' 
      };
    }

    const updatedTabs = [...(collection.laborCategoryTabs || []), newTab];

    await updateDoc(collectionRef, {
      laborCategoryTabs: updatedTabs,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding labor category tab:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add tab'
    };
  }
};

/**
 * Remove a labor category tab and its selections
 */
export const removeLaborCategoryTab = async (
  collectionId: string,
  tabId: string
): Promise<DatabaseResult<{ removedItems: number }>> => {
  try {
    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);
    
    if (!collectionSnap.exists()) {
      throw new Error('Collection not found');
    }

    const collection = collectionSnap.data() as Collection;
    
    const updatedTabs = (collection.laborCategoryTabs || []).filter(tab => tab.id !== tabId);
    
    const updatedSelections: Record<string, ItemSelection> = {};
    let removedCount = 0;
    
    Object.entries(collection.laborSelections || {}).forEach(([laborId, selection]) => {
      if (selection.categoryTabId !== tabId) {
        updatedSelections[laborId] = selection;
      } else {
        removedCount++;
      }
    });

    await updateDoc(collectionRef, {
      laborCategoryTabs: updatedTabs,
      laborSelections: updatedSelections,
      updatedAt: Timestamp.now()
    });

    return { 
      success: true, 
      data: { removedItems: removedCount }
    };
  } catch (error) {
    console.error('Error removing labor category tab:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove tab'
    };
  }
};

/**
 * ✅ Recursively remove undefined values from objects and arrays
 */
const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj
      .map(item => removeUndefinedValues(item))
      .filter(item => item !== null && item !== undefined);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = removeUndefinedValues(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  }
  
  return obj;
};

