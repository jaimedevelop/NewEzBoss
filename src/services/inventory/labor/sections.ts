// src/services/labor/sections.ts
// Labor section operations (Level 2 - under Trade)

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
import { LaborResponse } from './labor.types';

const LABOR_SECTIONS_COLLECTION = 'laborSections';

export interface LaborSection {
  id?: string;
  name: string;
  tradeId: string;      // References productTrades collection
  userId: string;
  createdAt?: any;
}

/**
 * Get all labor sections for a trade
 */
export const getLaborSections = async (
  tradeId: string,
  userId: string
): Promise<LaborResponse<LaborSection[]>> => {
  try {
    const q = query(
      collection(db, LABOR_SECTIONS_COLLECTION),
      where('userId', '==', userId),
      where('tradeId', '==', tradeId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const sections: LaborSection[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LaborSection[];

    return { success: true, data: sections };
  } catch (error) {
    console.error('Error getting labor sections:', error);
    return { success: false, error: 'Failed to fetch labor sections' };
  }
};

/**
 * Add a new labor section
 */
export const addLaborSection = async (
  name: string,
  tradeId: string,
  userId: string
): Promise<LaborResponse<string>> => {
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
    const existingResult = await getLaborSections(tradeId, userId);
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
      collection(db, LABOR_SECTIONS_COLLECTION),
      {
        name: name.trim(),
        tradeId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    return { success: true, data: sectionRef.id };
  } catch (error) {
    console.error('Error adding labor section:', error);
    return { success: false, error: 'Failed to add labor section' };
  }
};