// src/services/inventory/tools/subcategories.ts
// Tool subcategory operations (Level 4 - under Category)

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { ToolResponse, ToolSubcategory } from './tool.types';

const TOOL_SUBCATEGORIES_COLLECTION = 'toolSubcategories';

/**
 * Get all tool subcategories for a category
 */
export const getToolSubcategories = async (
  categoryId: string,
  userId: string
): Promise<ToolResponse<ToolSubcategory[]>> => {
  try {
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

    return { success: true, data: subcategories };
  } catch (error) {
    console.error('Error getting tool subcategories:', error);
    return { success: false, error: 'Failed to fetch tool subcategories' };
  }
};

/**
 * Add a new tool subcategory
 */
export const addToolSubcategory = async (
  name: string,
  categoryId: string,
  sectionId: string,
  tradeId: string,
  userId: string
): Promise<ToolResponse<string>> => {
  try {
    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Subcategory name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Subcategory name must be 30 characters or less' 
      };
    }

    // Check for duplicates within this category
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

    // Create subcategory
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

    return { success: true, data: subcategoryRef.id };
  } catch (error) {
    console.error('Error adding tool subcategory:', error);
    return { success: false, error: 'Failed to add tool subcategory' };
  }
};