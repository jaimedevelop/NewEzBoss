// src/services/inventory/tools/categories.ts
// Tool category operations (Level 3 - under Section)

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
import { ToolResponse, ToolCategory } from './tool.types';

const TOOL_CATEGORIES_COLLECTION = 'toolCategories';

/**
 * Get all tool categories for a section
 */
export const getToolCategories = async (
  sectionId: string,
  userId: string
): Promise<ToolResponse<ToolCategory[]>> => {
  try {
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

    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting tool categories:', error);
    return { success: false, error: 'Failed to fetch tool categories' };
  }
};

/**
 * Add a new tool category
 */
export const addToolCategory = async (
  name: string,
  sectionId: string,
  tradeId: string,
  userId: string
): Promise<ToolResponse<string>> => {
  try {
    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Category name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Category name must be 30 characters or less' 
      };
    }

    // Check for duplicates within this section
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

    // Create category
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

    return { success: true, data: categoryRef.id };
  } catch (error) {
    console.error('Error adding tool category:', error);
    return { success: false, error: 'Failed to add tool category' };
  }
};