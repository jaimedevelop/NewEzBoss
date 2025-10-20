// src/services/inventory/equipment/subcategories.ts
// Equipment subcategory operations (Level 4 - under Category)

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
import { EquipmentResponse, EquipmentSubcategory } from './equipment.types';

const EQUIPMENT_SUBCATEGORIES_COLLECTION = 'equipmentSubcategories';

/**
 * Get all equipment subcategories for a category
 */
export const getEquipmentSubcategories = async (
  categoryId: string,
  userId: string
): Promise<EquipmentResponse<EquipmentSubcategory[]>> => {
  try {
    const q = query(
      collection(db, EQUIPMENT_SUBCATEGORIES_COLLECTION),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const subcategories: EquipmentSubcategory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EquipmentSubcategory[];

    return { success: true, data: subcategories };
  } catch (error) {
    console.error('Error getting equipment subcategories:', error);
    return { success: false, error: 'Failed to fetch equipment subcategories' };
  }
};

/**
 * Add a new equipment subcategory
 */
export const addEquipmentSubcategory = async (
  name: string,
  categoryId: string,
  sectionId: string,
  tradeId: string,
  userId: string
): Promise<EquipmentResponse<string>> => {
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
    const existingResult = await getEquipmentSubcategories(categoryId, userId);
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
      collection(db, EQUIPMENT_SUBCATEGORIES_COLLECTION),
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
    console.error('Error adding equipment subcategory:', error);
    return { success: false, error: 'Failed to add equipment subcategory' };
  }
};