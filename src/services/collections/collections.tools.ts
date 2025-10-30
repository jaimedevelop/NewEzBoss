// src/services/collections/collections.tools.ts
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
const PRODUCTS_COLLECTION = 'products'; // Tools are in products collection

/**
 * Update a single tool selection
 */
export const updateToolSelection = async (
  collectionId: string,
  toolId: string,
  selection: Partial<ItemSelection>
): Promise<DatabaseResult> => {
  try {
    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);

    if (!collectionSnap.exists()) {
      return { success: false, error: 'Collection not found' };
    }

    const currentData = collectionSnap.data() as Collection;
    const toolSelections = { ...(currentData.toolSelections || {}) };
    
    toolSelections[toolId] = {
      ...toolSelections[toolId],
      ...selection,
      addedAt: selection.addedAt || Date.now(),
    };

    if (!selection.isSelected || (selection.quantity !== undefined && selection.quantity <= 0)) {
      delete toolSelections[toolId];
    }

    await updateDoc(collectionRef, {
      toolSelections,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating tool selection:', error);
    return { success: false, error };
  }
};

/**
 * Batch update multiple tool selections
 */
export const batchUpdateToolSelections = async (
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
    const toolSelections = { ...(currentData.toolSelections || {}) };
    
    Object.entries(selections).forEach(([toolId, selection]) => {
      if (!selection.isSelected || (selection.quantity !== undefined && selection.quantity <= 0)) {
        delete toolSelections[toolId];
      } else {
        toolSelections[toolId] = {
          ...toolSelections[toolId],
          ...selection,
          addedAt: selection.addedAt || Date.now(),
        };
      }
    });

    await updateDoc(collectionRef, {
      toolSelections,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error batch updating tool selections:', error);
    return { success: false, error };
  }
};

/**
 * Get tools for collection tabs
 */
export const getToolsForCollectionTabs = async (
  toolIds: string[]
): Promise<DatabaseResult<any[]>> => {
  try {
    if (toolIds.length === 0) {
      return { success: true, data: [] };
    }

    const batches: string[][] = [];
    for (let i = 0; i < toolIds.length; i += 10) {
      batches.push(toolIds.slice(i, i + 10));
    }

    const allTools: any[] = [];

    for (const batch of batches) {
      const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where('__name__', 'in', batch)
      );
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Only include tools (productType === 'tool')
        if (data.productType === 'tool') {
          allTools.push({ id: doc.id, ...data });
        }
      });
    }

    return { success: true, data: allTools };
  } catch (error) {
    console.error('Error getting tools for collection tabs:', error);
    return { success: false, error };
  }
};

/**
 * Add a tool category tab to a collection
 */
export const addToolCategoryTab = async (
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
    
    const existingTab = collection.toolCategoryTabs?.find(
      tab => tab.category === newTab.category && tab.section === newTab.section
    );
    
    if (existingTab) {
      return { 
        success: false, 
        error: 'This category already exists in the collection' 
      };
    }

    const updatedTabs = [...(collection.toolCategoryTabs || []), newTab];

    await updateDoc(collectionRef, {
      toolCategoryTabs: updatedTabs,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding tool category tab:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add tab'
    };
  }
};

/**
 * Remove a tool category tab and its selections
 */
export const removeToolCategoryTab = async (
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
    
    const updatedTabs = (collection.toolCategoryTabs || []).filter(tab => tab.id !== tabId);
    
    const updatedSelections: Record<string, ItemSelection> = {};
    let removedCount = 0;
    
    Object.entries(collection.toolSelections || {}).forEach(([toolId, selection]) => {
      if (selection.categoryTabId !== tabId) {
        updatedSelections[toolId] = selection;
      } else {
        removedCount++;
      }
    });

    await updateDoc(collectionRef, {
      toolCategoryTabs: updatedTabs,
      toolSelections: updatedSelections,
      updatedAt: Timestamp.now()
    });

    return { 
      success: true, 
      data: { removedItems: removedCount }
    };
  } catch (error) {
    console.error('Error removing tool category tab:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove tab'
    };
  }
};