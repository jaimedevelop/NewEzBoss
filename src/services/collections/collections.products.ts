// src/services/collections/collections.products.ts
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
const PRODUCTS_COLLECTION = 'products';

/**
 * Update a single product selection
 */
export const updateProductSelection = async (
  collectionId: string,
  productId: string,
  selection: Partial<ItemSelection>
): Promise<DatabaseResult> => {
  try {
    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);

    if (!collectionSnap.exists()) {
      return { success: false, error: 'Collection not found' };
    }

    const currentData = collectionSnap.data() as Collection;
    const productSelections = { ...(currentData.productSelections || {}) };
    
    // Update or create selection
    productSelections[productId] = {
      ...productSelections[productId],
      ...selection,
      addedAt: selection.addedAt || Date.now(),
    };

    // If quantity is 0 or isSelected is false, remove the selection
    if (!selection.isSelected || (selection.quantity !== undefined && selection.quantity <= 0)) {
      delete productSelections[productId];
    }

    await updateDoc(collectionRef, {
      productSelections,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating product selection:', error);
    return { success: false, error };
  }
};

/**
 * Batch update multiple product selections
 */
export const batchUpdateProductSelections = async (
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
    const productSelections = { ...(currentData.productSelections || {}) };
    
    // Apply all updates
    Object.entries(selections).forEach(([productId, selection]) => {
      if (!selection.isSelected || (selection.quantity !== undefined && selection.quantity <= 0)) {
        delete productSelections[productId];
      } else {
        productSelections[productId] = {
          ...productSelections[productId],
          ...selection,
          addedAt: selection.addedAt || Date.now(),
        };
      }
    });

    await updateDoc(collectionRef, {
      productSelections,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error batch updating product selections:', error);
    return { success: false, error };
  }
};

/**
 * Get products for collection tabs
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

    const allProducts: any[] = [];

    for (const batch of batches) {
      const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where('__name__', 'in', batch)
      );
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        allProducts.push({ id: doc.id, ...doc.data() });
      });
    }

    return { success: true, data: allProducts };
  } catch (error) {
    console.error('Error getting products for collection tabs:', error);
    return { success: false, error };
  }
};

/**
 * Add a product category tab to a collection
 */
export const addProductCategoryTab = async (
  collectionId: string,
  newTab: CategoryTab
): Promise<DatabaseResult> => {
  try {
    if (!collectionId) {
      throw new Error('Collection ID is required');
    }

    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);
    
    if (!collectionSnap.exists()) {
      throw new Error('Collection not found');
    }

    const collection = collectionSnap.data() as Collection;
    
    // Check if tab already exists
    const existingTab = collection.productCategoryTabs?.find(
      tab => tab.category === newTab.category && tab.section === newTab.section
    );
    
    if (existingTab) {
      return { 
        success: false, 
        error: 'This category already exists in the collection' 
      };
    }

    // Add new tab
    const updatedTabs = [...(collection.productCategoryTabs || []), newTab];

    await updateDoc(collectionRef, {
      productCategoryTabs: updatedTabs,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding product category tab:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add tab'
    };
  }
};

/**
 * Remove a product category tab and its selections
 */
export const removeProductCategoryTab = async (
  collectionId: string,
  tabId: string
): Promise<DatabaseResult<{ removedProducts: number }>> => {
  try {
    if (!collectionId || !tabId) {
      throw new Error('Collection ID and Tab ID are required');
    }

    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);
    
    if (!collectionSnap.exists()) {
      throw new Error('Collection not found');
    }

    const collection = collectionSnap.data() as Collection;
    
    // Remove the tab
    const updatedTabs = (collection.productCategoryTabs || []).filter(tab => tab.id !== tabId);
    
    // Remove product selections for this tab
    const updatedSelections: Record<string, ItemSelection> = {};
    let removedCount = 0;
    
    Object.entries(collection.productSelections || {}).forEach(([productId, selection]) => {
      if (selection.categoryTabId !== tabId) {
        updatedSelections[productId] = selection;
      } else {
        removedCount++;
      }
    });

    await updateDoc(collectionRef, {
      productCategoryTabs: updatedTabs,
      productSelections: updatedSelections,
      updatedAt: Timestamp.now()
    });

    return { 
      success: true, 
      data: { removedProducts: removedCount }
    };
  } catch (error) {
    console.error('Error removing product category tab:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove tab'
    };
  }
};