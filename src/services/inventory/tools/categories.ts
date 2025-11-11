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
import { ToolResponse, ToolCategory } from './tool.types';
import { hierarchyCache } from '../../../utils/hierarchyCache';

const TOOL_CATEGORIES_COLLECTION = 'toolCategories';

export const getToolCategories = async (
  sectionId: string,
  userId: string
): Promise<ToolResponse<ToolCategory[]>> => {
  try {
    // Check cache first
    const cached = hierarchyCache.getCategories('tools', sectionId, userId);
    if (cached) {
      console.log('✅ Tool categories loaded from cache');
      return { success: true, data: cached };
    }

    const q = query(
      collection(db, TOOL_CATEGORIES_COLLECTION),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const categories: ToolCategory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ToolCategory[];

    // Update cache
    hierarchyCache.setCategories('tools', sectionId, userId, categories);
    console.log('✅ Tool categories loaded from Firebase and cached');

    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting tool categories:', error);
    return { success: false, error: 'Failed to fetch tool categories' };
  }
};

export const addToolCategory = async (
  name: string,
  sectionId: string,
  tradeId: string,
  userId: string
): Promise<ToolResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Category name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Category name must be 30 characters or less' 
      };
    }

    const existingResult = await getToolCategories(sectionId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        category => category.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A category with this name already exists for this section' 
        };
      }
    }

    const categoryRef = await addDoc(
      collection(db, TOOL_CATEGORIES_COLLECTION),
      {
        name: name.trim(),
        sectionId,
        tradeId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    // Clear cache
    hierarchyCache.clearCategoriesForSection('tools', sectionId, userId);

    return { success: true, data: categoryRef.id };
  } catch (error) {
    console.error('Error adding tool category:', error);
    return { success: false, error: 'Failed to add tool category' };
  }
};

export const updateToolCategoryName = async (
  categoryId: string,
  newName: string,
  userId: string
): Promise<ToolResponse<void>> => {
  try {
    const categoryRef = doc(db, TOOL_CATEGORIES_COLLECTION, categoryId);
    
    const categoryDoc = await getDocs(query(
      collection(db, TOOL_CATEGORIES_COLLECTION),
      where('__name__', '==', categoryId)
    ));
    
    if (!categoryDoc.empty) {
      const categoryData = categoryDoc.docs[0].data();
      const sectionId = categoryData.sectionId;
      
      await updateDoc(categoryRef, { name: newName });
      hierarchyCache.clearCategoriesForSection('tools', sectionId, userId);
    } else {
      await updateDoc(categoryRef, { name: newName });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating tool category:', error);
    return { success: false, error: 'Failed to update tool category' };
  }
};

export const deleteToolCategoryWithChildren = async (
  categoryId: string,
  userId: string
): Promise<ToolResponse<void>> => {
  try {
    const batch = writeBatch(db);

    const categoryDoc = await getDocs(query(
      collection(db, TOOL_CATEGORIES_COLLECTION),
      where('__name__', '==', categoryId)
    ));
    
    let sectionId: string | null = null;
    if (!categoryDoc.empty) {
      sectionId = categoryDoc.docs[0].data().sectionId;
    }

    // Delete subcategories
    const subcategoriesQuery = query(
      collection(db, 'toolSubcategories'),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId)
    );
    const subcategoriesSnapshot = await getDocs(subcategoriesQuery);
    subcategoriesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete tool items
    const toolItemsQuery = query(
      collection(db, 'tool_items'),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId)
    );
    const toolItemsSnapshot = await getDocs(toolItemsQuery);
    toolItemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    const categoryRef = doc(db, TOOL_CATEGORIES_COLLECTION, categoryId);
    batch.delete(categoryRef);

    await batch.commit();

    // Clear caches
    if (sectionId) {
      hierarchyCache.clearCategoriesForSection('tools', sectionId, userId);
    }
    hierarchyCache.clearSubcategoriesForCategory('tools', categoryId, userId);

    return { success: true };
  } catch (error) {
    console.error('Error deleting tool category:', error);
    return { success: false, error: 'Failed to delete tool category' };
  }
};

export const getToolCategoryUsageStats = async (
  categoryId: string,
  userId: string
): Promise<ToolResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const subcategoriesQuery = query(
      collection(db, 'toolSubcategories'),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId)
    );
    const subcategoriesSnapshot = await getDocs(subcategoriesQuery);
    const categoryCount = subcategoriesSnapshot.size;

    const itemsQuery = query(
      collection(db, 'tool_items'),
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
    console.error('Error getting tool category usage stats:', error);
    return {
      success: false,
      error: 'Failed to get usage statistics'
    };
  }
};