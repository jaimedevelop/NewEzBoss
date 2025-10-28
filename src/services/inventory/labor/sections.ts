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

export interface LaborSection {
  id?: string;
  name: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

const COLLECTION_NAME = 'laborSections';

export const getSections = async (
  tradeId: string,
  userId: string
): Promise<LaborResponse<LaborSection[]>> => {
  try {
    // Check cache first
    const cached = laborHierarchyCache.getSections(tradeId, userId);
    if (cached) {
      console.log('✅ Sections loaded from cache');
      return { success: true, data: cached };
    }

    // Cache miss - fetch from Firebase
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('tradeId', '==', tradeId)
    );

    const snapshot = await getDocs(q);
    const sections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as LaborSection));

    // Update cache
    laborHierarchyCache.setSections(tradeId, userId, sections);
    console.log('✅ Sections loaded from Firebase and cached');

    return { success: true, data: sections };
  } catch (error) {
    console.error('❌ Error getting sections:', error);
    return { success: false, error: 'Failed to load sections' };
  }
};

export const addSection = async (
  name: string,
  tradeId: string,
  userId: string
): Promise<LaborResponse<string>> => {
  try {
    // Check for duplicates
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('tradeId', '==', tradeId),
      where('name', '==', name)
    );

    const existing = await getDocs(q);
    if (!existing.empty) {
      return { success: false, error: 'Section already exists' };
    }

    // Create new section
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      name,
      tradeId,
      userId,
      createdAt: Timestamp.now()
    });

    // Clear cache for this trade
    laborHierarchyCache.clearSectionsForTrade(tradeId, userId);

    return { success: true, data: docRef.id };
  } catch (error) {
    console.error('❌ Error adding section:', error);
    return { success: false, error: 'Failed to create section' };
  }
};

export const updateSectionName = async (
  sectionId: string,
  newName: string,
  userId: string
): Promise<LaborResponse<void>> => {
  try {
    const sectionRef = doc(db, COLLECTION_NAME, sectionId);
    
    // Get the section to find its tradeId
    const sectionDoc = await getDocs(query(
      collection(db, COLLECTION_NAME),
      where('__name__', '==', sectionId)
    ));
    
    if (!sectionDoc.empty) {
      const sectionData = sectionDoc.docs[0].data();
      const tradeId = sectionData.tradeId;
      
      // Update the name
      await updateDoc(sectionRef, { name: newName });
      
      // Clear cache for this trade
      laborHierarchyCache.clearSectionsForTrade(tradeId, userId);
    } else {
      await updateDoc(sectionRef, { name: newName });
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error updating section:', error);
    return { success: false, error: 'Failed to update section' };
  }
};

export const deleteSectionWithChildren = async (
  sectionId: string,
  userId: string
): Promise<LaborResponse<void>> => {
  try {
    const batch = writeBatch(db);

    // Get section to find tradeId
    const sectionDoc = await getDocs(query(
      collection(db, COLLECTION_NAME),
      where('__name__', '==', sectionId)
    ));
    
    let tradeId: string | null = null;
    if (!sectionDoc.empty) {
      tradeId = sectionDoc.docs[0].data().tradeId;
    }

    // Delete all categories in this section
    const categoriesQuery = query(
      collection(db, 'laborCategories'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const categoriesSnapshot = await getDocs(categoriesQuery);
    categoriesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete all labor items with this section
    const laborItemsQuery = query(
      collection(db, 'labor_items'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const laborItemsSnapshot = await getDocs(laborItemsQuery);
    laborItemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the section itself
    const sectionRef = doc(db, COLLECTION_NAME, sectionId);
    batch.delete(sectionRef);

    await batch.commit();

    // Clear caches
    if (tradeId) {
      laborHierarchyCache.clearSectionsForTrade(tradeId, userId);
    }
    laborHierarchyCache.clearCategoriesForSection(sectionId, userId);

    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting section:', error);
    return { success: false, error: 'Failed to delete section' };
  }
};

export const getSectionUsageStats = async (
  sectionId: string,
  userId: string
): Promise<LaborResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    // Count categories
    const categoriesQuery = query(
      collection(db, 'laborCategories'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const categoriesSnapshot = await getDocs(categoriesQuery);
    const categoryCount = categoriesSnapshot.size;

    // Count labor items
    const itemsQuery = query(
      collection(db, 'labor_items'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    const itemCount = itemsSnapshot.size;

    return {
      success: true,
      data: { categoryCount, itemCount }
    };
  } catch (error) {
    console.error('❌ Error getting section usage stats:', error);
    return {
      success: false,
      error: 'Failed to get usage statistics'
    };
  }
};