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
import { ToolResponse, ToolSubcategory } from './tool.types';
import { hierarchyCache } from '../../../utils/hierarchyCache';

const TOOL_SUBCATEGORIES_COLLECTION = 'toolSubcategories';

export const getToolSubcategories = async (
  categoryId: string,
  userId: string
): Promise<ToolResponse<ToolSubcategory[]>> => {
  try {
    // Check cache first
    const cached = hierarchyCache.getSubcategories('tools', categoryId, userId);
    if (cached) {
      console.log('✅ Tool subcategories loaded from cache');
      return { success: true, data: cached };
    }

    const q = query(
      collection(db, TOOL_SUBCATEGORIES_COLLECTION),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const subcategories: ToolSubcategory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ToolSubcategory[];

    // Update cache
    hierarchyCache.setSubcategories('tools', categoryId, userId, subcategories);
    console.log('✅ Tool subcategories loaded from Firebase and cached');

    return { success: true, data: subcategories };
  } catch (error) {
    console.error('Error getting tool subcategories:', error);
    return { success: false, error: 'Failed to fetch tool subcategories' };
  }
};

export const addToolSubcategory = async (
  name: string,
  categoryId: string,
  sectionId: string,
  tradeId: string,
  userId: string
): Promise<ToolResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Subcategory name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Subcategory name must be 30 characters or less' 
      };
    }

    const existingResult = await getToolSubcategories(categoryId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        subcategory => subcategory.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A subcategory with this name already exists for this category' 
        };
      }
    }

    const subcategoryRef = await addDoc(
      collection(db, TOOL_SUBCATEGORIES_COLLECTION),
      {
        name: name.trim(),
        categoryId,
        sectionId,
        tradeId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    // Clear cache
    hierarchyCache.clearSubcategoriesForCategory('tools', categoryId, userId);

    return { success: true, data: subcategoryRef.id };
  } catch (error) {
    console.error('Error adding tool subcategory:', error);
    return { success: false, error: 'Failed to add tool subcategory' };
  }
};

export const updateToolSubcategoryName = async (
  subcategoryId: string,
  newName: string,
  userId: string
): Promise<ToolResponse<void>> => {
  try {
    const subcategoryRef = doc(db, TOOL_SUBCATEGORIES_COLLECTION, subcategoryId);
    
    const subcategoryDoc = await getDocs(query(
      collection(db, TOOL_SUBCATEGORIES_COLLECTION),
      where('__name__', '==', subcategoryId)
    ));
    
    if (!subcategoryDoc.empty) {
      const subcategoryData = subcategoryDoc.docs[0].data();
      const categoryId = subcategoryData.categoryId;
      
      await updateDoc(subcategoryRef, { name: newName });
      hierarchyCache.clearSubcategoriesForCategory('tools', categoryId, userId);
    } else {
      await updateDoc(subcategoryRef, { name: newName });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating tool subcategory:', error);
    return { success: false, error: 'Failed to update tool subcategory' };
  }
};

export const deleteToolSubcategoryWithChildren = async (
  subcategoryId: string,
  userId: string
): Promise<ToolResponse<void>> => {
  try {
    const batch = writeBatch(db);

    const subcategoryDoc = await getDocs(query(
      collection(db, TOOL_SUBCATEGORIES_COLLECTION),
      where('__name__', '==', subcategoryId)
    ));
    
    let categoryId: string | null = null;
    if (!subcategoryDoc.empty) {
      categoryId = subcategoryDoc.docs[0].data().categoryId;
    }

    // Delete tool items
    const toolItemsQuery = query(
      collection(db, 'tool_items'),
      where('userId', '==', userId),
      where('subcategoryId', '==', subcategoryId)
    );
    const toolItemsSnapshot = await getDocs(toolItemsQuery);
    toolItemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    const subcategoryRef = doc(db, TOOL_SUBCATEGORIES_COLLECTION, subcategoryId);
    batch.delete(subcategoryRef);

    await batch.commit();

    // Clear cache
    if (categoryId) {
      hierarchyCache.clearSubcategoriesForCategory('tools', categoryId, userId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting tool subcategory:', error);
    return { success: false, error: 'Failed to delete tool subcategory' };
  }
};

export const getToolSubcategoryUsageStats = async (
  subcategoryId: string,
  userId: string
): Promise<ToolResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const categoryCount = 0; // Subcategories don't have children

    const itemsQuery = query(
      collection(db, 'tool_items'),
      where('userId', '==', userId),
      where('subcategoryId', '==', subcategoryId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    const itemCount = itemsSnapshot.size;

    return {
      success: true,
      data: { categoryCount, itemCount }
    };
  } catch (error) {
    console.error('Error getting tool subcategory usage stats:', error);
    return {
      success: false,
      error: 'Failed to get usage statistics'
    };
  }
};