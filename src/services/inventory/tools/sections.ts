import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { ToolResponse, ToolSection } from './tool.types';
import { hierarchyCache } from '../../../utils/hierarchyCache';

const TOOL_SECTIONS_COLLECTION = 'toolSections';

export const getToolSections = async (
  tradeId: string,
  userId: string
): Promise<ToolResponse<ToolSection[]>> => {
  try {
    // Check cache first
    const cached = hierarchyCache.getSections('tools', tradeId, userId);
    if (cached) {
      console.log('✅ Tool sections loaded from cache');
      return { success: true, data: cached };
    }

    const q = query(
      collection(db, TOOL_SECTIONS_COLLECTION),
      where('userId', '==', userId),
      where('tradeId', '==', tradeId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const sections: ToolSection[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ToolSection[];

    // Update cache
    hierarchyCache.setSections('tools', tradeId, userId, sections);
    console.log('✅ Tool sections loaded from Firebase and cached');

    return { success: true, data: sections };
  } catch (error) {
    console.error('Error getting tool sections:', error);
    return { success: false, error: 'Failed to fetch tool sections' };
  }
};

export const addToolSection = async (
  name: string,
  tradeId: string,
  userId: string
): Promise<ToolResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Section name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Section name must be 30 characters or less' 
      };
    }

    const existingResult = await getToolSections(tradeId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        section => section.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A section with this name already exists for this trade' 
        };
      }
    }

    const sectionRef = await addDoc(
      collection(db, TOOL_SECTIONS_COLLECTION),
      {
        name: name.trim(),
        tradeId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    // Clear cache
    hierarchyCache.clearSectionsForTrade('tools', tradeId, userId);

    return { success: true, data: sectionRef.id };
  } catch (error) {
    console.error('Error adding tool section:', error);
    return { success: false, error: 'Failed to add tool section' };
  }
};

export const updateToolSectionName = async (
  sectionId: string,
  newName: string,
  userId: string
): Promise<ToolResponse<void>> => {
  try {
    const sectionRef = doc(db, TOOL_SECTIONS_COLLECTION, sectionId);
    
    const sectionDoc = await getDocs(query(
      collection(db, TOOL_SECTIONS_COLLECTION),
      where('__name__', '==', sectionId)
    ));
    
    if (!sectionDoc.empty) {
      const sectionData = sectionDoc.docs[0].data();
      const tradeId = sectionData.tradeId;
      
      await updateDoc(sectionRef, { name: newName });
      hierarchyCache.clearSectionsForTrade('tools', tradeId, userId);
    } else {
      await updateDoc(sectionRef, { name: newName });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating tool section:', error);
    return { success: false, error: 'Failed to update tool section' };
  }
};

export const deleteToolSectionWithChildren = async (
  sectionId: string,
  userId: string
): Promise<ToolResponse<void>> => {
  try {
    const batch = writeBatch(db);

    const sectionDoc = await getDocs(query(
      collection(db, TOOL_SECTIONS_COLLECTION),
      where('__name__', '==', sectionId)
    ));
    
    let tradeId: string | null = null;
    if (!sectionDoc.empty) {
      tradeId = sectionDoc.docs[0].data().tradeId;
    }

    // Delete categories
    const categoriesQuery = query(
      collection(db, 'toolCategories'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const categoriesSnapshot = await getDocs(categoriesQuery);
    
    const categoryIds: string[] = [];
    categoriesSnapshot.docs.forEach(doc => {
      categoryIds.push(doc.id);
      batch.delete(doc.ref);
    });

    // Delete subcategories
    for (const categoryId of categoryIds) {
      const subcategoriesQuery = query(
        collection(db, 'toolSubcategories'),
        where('userId', '==', userId),
        where('categoryId', '==', categoryId)
      );
      const subcategoriesSnapshot = await getDocs(subcategoriesQuery);
      subcategoriesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    // Delete tool items
    const toolItemsQuery = query(
      collection(db, 'tool_items'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const toolItemsSnapshot = await getDocs(toolItemsQuery);
    toolItemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    const sectionRef = doc(db, TOOL_SECTIONS_COLLECTION, sectionId);
    batch.delete(sectionRef);

    await batch.commit();

    // Clear caches
    if (tradeId) {
      hierarchyCache.clearSectionsForTrade('tools', tradeId, userId);
    }
    hierarchyCache.clearCategoriesForSection('tools', sectionId, userId);

    return { success: true };
  } catch (error) {
    console.error('Error deleting tool section:', error);
    return { success: false, error: 'Failed to delete tool section' };
  }
};

export const getToolSectionUsageStats = async (
  sectionId: string,
  userId: string
): Promise<ToolResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const categoriesQuery = query(
      collection(db, 'toolCategories'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const categoriesSnapshot = await getDocs(categoriesQuery);
    const categoryCount = categoriesSnapshot.size;

    const itemsQuery = query(
      collection(db, 'tool_items'),
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
    console.error('Error getting tool section usage stats:', error);
    return {
      success: false,
      error: 'Failed to get usage statistics'
    };
  }
};