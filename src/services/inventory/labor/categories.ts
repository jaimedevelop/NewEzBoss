import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import type { LaborResponse } from './labor.types';
import { laborHierarchyCache } from '../../../utils/hierarchyCache';

export interface LaborCategory {
  id?: string;
  name: string;
  sectionId: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

const COLLECTION_NAME = 'laborCategories';

export const getCategories = async (
  sectionId: string,
  userId: string
): Promise<LaborResponse<LaborCategory[]>> => {
  try {
    // Check cache first
    const cached = laborHierarchyCache.getCategories(sectionId, userId);
    if (cached) {
      console.log('✅ Categories loaded from cache');
      return { success: true, data: cached };
    }

    // Cache miss - fetch from Firebase
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );

    const snapshot = await getDocs(q);
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as LaborCategory));

    // Update cache
    laborHierarchyCache.setCategories(sectionId, userId, categories);
    console.log('✅ Categories loaded from Firebase and cached');

    return { success: true, data: categories };
  } catch (error) {
    console.error('❌ Error getting categories:', error);
    return { success: false, error: 'Failed to load categories' };
  }
};

export const addCategory = async (
  name: string,
  sectionId: string,
  tradeId: string,
  userId: string
): Promise<LaborResponse<string>> => {
  try {
    // Check for duplicates
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId),
      where('name', '==', name)
    );

    const existing = await getDocs(q);
    if (!existing.empty) {
      return { success: false, error: 'Category already exists' };
    }

    // Create new category
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      name,
      sectionId,
      tradeId,
      userId,
      createdAt: Timestamp.now()
    });

    // Clear cache for this section
    laborHierarchyCache.clearCategoriesForSection(sectionId, userId);

    return { success: true, data: docRef.id };
  } catch (error) {
    console.error('❌ Error adding category:', error);
    return { success: false, error: 'Failed to create category' };
  }
};

export const updateCategoryName = async (
  categoryId: string,
  newName: string,
  userId: string
): Promise<LaborResponse<void>> => {
  try {
    const categoryRef = doc(db, COLLECTION_NAME, categoryId);
    
    // Get the category to find its sectionId
    const categoryDoc = await getDocs(query(
      collection(db, COLLECTION_NAME),
      where('__name__', '==', categoryId)
    ));
    
    if (!categoryDoc.empty) {
      const categoryData = categoryDoc.docs[0].data();
      const sectionId = categoryData.sectionId;
      
      // Update the name
      await updateDoc(categoryRef, { name: newName });
      
      // Clear cache for this section
      laborHierarchyCache.clearCategoriesForSection(sectionId, userId);
    } else {
      await updateDoc(categoryRef, { name: newName });
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error updating category:', error);
    return { success: false, error: 'Failed to update category' };
  }
};

export const deleteCategoryWithChildren = async (
  categoryId: string,
  userId: string
): Promise<LaborResponse<void>> => {
  try {
    const batch = writeBatch(db);

    // Get category to find sectionId
    const categoryDoc = await getDocs(query(
      collection(db, COLLECTION_NAME),
      where('__name__', '==', categoryId)
    ));
    
    let sectionId: string | null = null;
    if (!categoryDoc.empty) {
      sectionId = categoryDoc.docs[0].data().sectionId;
    }

    // Delete all labor items with this category
    const laborItemsQuery = query(
      collection(db, 'labor_items'),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId)
    );
    const laborItemsSnapshot = await getDocs(laborItemsQuery);
    laborItemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the category itself
    const categoryRef = doc(db, COLLECTION_NAME, categoryId);
    batch.delete(categoryRef);

    await batch.commit();

    // Clear cache
    if (sectionId) {
      laborHierarchyCache.clearCategoriesForSection(sectionId, userId);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting category:', error);
    return { success: false, error: 'Failed to delete category' };
  }
};

export const getCategoryUsageStats = async (
  categoryId: string,
  userId: string
): Promise<LaborResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    // For categories, categoryCount is always 0 (no subcategories in labor)
    const categoryCount = 0;

    // Count labor items
    const itemsQuery = query(
      collection(db, 'labor_items'),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    const itemCount = itemsSnapshot.size;

    return {
      success: true,
      data: { categoryCount, itemCount }
    };
  } catch (error) {
    console.error('❌ Error getting category usage stats:', error);
    return {
      success: false,
      error: 'Failed to get usage statistics'
    };
  }
};