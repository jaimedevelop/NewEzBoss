// src/services/inventory/equipment/sections.ts
// Equipment section operations (Level 2 - under Trade)

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
import { EquipmentResponse, EquipmentSection } from './equipment.types';

const EQUIPMENT_SECTIONS_COLLECTION = 'equipmentSections';

/**
 * Get all equipment sections for a trade
 */
export const getEquipmentSections = async (
  tradeId: string,
  userId: string
): Promise<EquipmentResponse<EquipmentSection[]>> => {
  try {
    const q = query(
      collection(db, EQUIPMENT_SECTIONS_COLLECTION),
      where('userId', '==', userId),
      where('tradeId', '==', tradeId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const sections: EquipmentSection[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EquipmentSection[];

    return { success: true, data: sections };
  } catch (error) {
    console.error('Error getting equipment sections:', error);
    return { success: false, error: 'Failed to fetch equipment sections' };
  }
};

/**
 * Add a new equipment section
 */
export const addEquipmentSection = async (
  name: string,
  tradeId: string,
  userId: string
): Promise<EquipmentResponse<string>> => {
  try {
    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Section name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Section name must be 30 characters or less' 
      };
    }

    // Check for duplicates within this trade
    const existingResult = await getEquipmentSections(tradeId, userId);
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

    // Create section
    const sectionRef = await addDoc(
      collection(db, EQUIPMENT_SECTIONS_COLLECTION),
      {
        name: name.trim(),
        tradeId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    return { success: true, data: sectionRef.id };
  } catch (error) {
    console.error('Error adding equipment section:', error);
    return { success: false, error: 'Failed to add equipment section' };
  }
};