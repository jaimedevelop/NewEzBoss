// src/services/inventory/tools/brands.ts
// Tool brand operations

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
import { ToolResponse } from './tool.types';

const TOOL_BRANDS_COLLECTION = 'tool_brands';

export interface ToolBrand {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

/**
 * Get all tool brands for a user
 */
export const getToolBrands = async (
  userId: string
): Promise<ToolResponse<ToolBrand[]>> => {
  try {
    const q = query(
      collection(db, TOOL_BRANDS_COLLECTION),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const brands: ToolBrand[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ToolBrand[];

    return { success: true, data: brands };
  } catch (error) {
    console.error('Error getting tool brands:', error);
    return { success: false, error: 'Failed to fetch tool brands' };
  }
};

/**
 * Add a new tool brand
 */
export const addToolBrand = async (
  name: string,
  userId: string
): Promise<ToolResponse<string>> => {
  try {
    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Brand name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Brand name must be 30 characters or less' 
      };
    }

    // Check for duplicates
    const existingResult = await getToolBrands(userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        brand => brand.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A brand with this name already exists' 
        };
      }
    }

    // Create brand
    const brandRef = await addDoc(
      collection(db, TOOL_BRANDS_COLLECTION),
      {
        name: name.trim(),
        userId,
        createdAt: serverTimestamp()
      }
    );

    return { success: true, data: brandRef.id };
  } catch (error) {
    console.error('Error adding tool brand:', error);
    return { success: false, error: 'Failed to add tool brand' };
  }
};