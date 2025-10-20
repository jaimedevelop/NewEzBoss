// src/services/inventory/equipment/categories.ts
// Equipment category operations (Level 3 - under Section)

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
import { EquipmentResponse, EquipmentCategory } from './equipment.types';

const EQUIPMENT_CATEGORIES_COLLECTION = 'equipmentCategories';

/**
 * Get all equipment categories for a section
 */
export const getEquipmentCategories = async (
  sectionId: string,
  userId: string
): Promise<EquipmentResponse<EquipmentCategory[]>> => {
  try {
    const q = query(
      collection(db, EQUIPMENT_CATEGORIES_COLLECTION),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const categories: EquipmentCategory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EquipmentCategory[];

    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting equipment categories:', error);
    return { success: false, error: 'Failed to fetch equipment categories' };
  }
};

/**
 * Add a new equipment category
 */
export const addEquipmentCategory = async (
  name: string,
  sectionId: string,
  tradeId: string,
  userId: string
): Promise<EquipmentResponse<string>> => {
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
    const existingResult = await getEquipmentCategories(sectionId, userId);
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
      collection(db, EQUIPMENT_CATEGORIES_COLLECTION),
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
    console.error('Error adding equipment category:', error);
    return { success: false, error: 'Failed to add equipment category' };
  }
};