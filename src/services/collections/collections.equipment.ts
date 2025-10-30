// src/services/collections/collections.equipment.ts
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
const PRODUCTS_COLLECTION = 'products'; // Equipment is in products collection

/**
 * Update a single equipment selection
 */
export const updateEquipmentSelection = async (
  collectionId: string,
  equipmentId: string,
  selection: Partial<ItemSelection>
): Promise<DatabaseResult> => {
  try {
    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);

    if (!collectionSnap.exists()) {
      return { success: false, error: 'Collection not found' };
    }

    const currentData = collectionSnap.data() as Collection;
    const equipmentSelections = { ...(currentData.equipmentSelections || {}) };
    
    equipmentSelections[equipmentId] = {
      ...equipmentSelections[equipmentId],
      ...selection,
      addedAt: selection.addedAt || Date.now(),
    };

    if (!selection.isSelected || (selection.quantity !== undefined && selection.quantity <= 0)) {
      delete equipmentSelections[equipmentId];
    }

    await updateDoc(collectionRef, {
      equipmentSelections,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating equipment selection:', error);
    return { success: false, error };
  }
};

/**
 * Batch update multiple equipment selections
 */
export const batchUpdateEquipmentSelections = async (
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
    const equipmentSelections = { ...(currentData.equipmentSelections || {}) };
    
    Object.entries(selections).forEach(([equipmentId, selection]) => {
      if (!selection.isSelected || (selection.quantity !== undefined && selection.quantity <= 0)) {
        delete equipmentSelections[equipmentId];
      } else {
        equipmentSelections[equipmentId] = {
          ...equipmentSelections[equipmentId],
          ...selection,
          addedAt: selection.addedAt || Date.now(),
        };
      }
    });

    await updateDoc(collectionRef, {
      equipmentSelections,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error batch updating equipment selections:', error);
    return { success: false, error };
  }
};

/**
 * Get equipment for collection tabs
 */
export const getEquipmentForCollectionTabs = async (
  equipmentIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (equipmentIds.length === 0) {
      return { success: true, data: [] };
    }

    const batches: string[][] = [];
    for (let i = 0; i < equipmentIds.length; i += 10) {
      batches.push(equipmentIds.slice(i, i + 10));
    }

    const allEquipment: any[] = [];

    for (const batch of batches) {
      const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where('__name__', 'in', batch)
      );
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Only include equipment (productType === 'equipment')
        if (data.productType === 'equipment') {
          allEquipment.push({ id: doc.id, ...data });
        }
      });
    }

    return { success: true, data: allEquipment };
  } catch (error) {
    console.error('Error getting equipment for collection tabs:', error);
    return { success: false, error };
  }
};

/**
 * Add an equipment category tab to a collection
 */
export const addEquipmentCategoryTab = async (
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
    
    const existingTab = collection.equipmentCategoryTabs?.find(
      tab => tab.category === newTab.category && tab.section === newTab.section
    );
    
    if (existingTab) {
      return { 
        success: false, 
        error: 'This category already exists in the collection' 
      };
    }

    const updatedTabs = [...(collection.equipmentCategoryTabs || []), newTab];

    await updateDoc(collectionRef, {
      equipmentCategoryTabs: updatedTabs,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding equipment category tab:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add tab'
    };
  }
};

/**
 * Remove an equipment category tab and its selections
 */
export const removeEquipmentCategoryTab = async (
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
    
    const updatedTabs = (collection.equipmentCategoryTabs || []).filter(tab => tab.id !== tabId);
    
    const updatedSelections: Record<string, ItemSelection> = {};
    let removedCount = 0;
    
    Object.entries(collection.equipmentSelections || {}).forEach(([equipmentId, selection]) => {
      if (selection.categoryTabId !== tabId) {
        updatedSelections[equipmentId] = selection;
      } else {
        removedCount++;
      }
    });

    await updateDoc(collectionRef, {
      equipmentCategoryTabs: updatedTabs,
      equipmentSelections: updatedSelections,
      updatedAt: Timestamp.now()
    });

    return { 
      success: true, 
      data: { removedItems: removedCount }
    };
  } catch (error) {
    console.error('Error removing equipment category tab:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove tab'
    };
  }
};