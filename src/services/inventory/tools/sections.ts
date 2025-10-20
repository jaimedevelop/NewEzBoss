// src/services/inventory/tools/sections.ts
// Tool section operations (Level 2 - under Trade)

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
import { ToolResponse, ToolSection } from './tool.types';

const TOOL_SECTIONS_COLLECTION = 'toolSections';

/**
 * Get all tool sections for a trade
 */
export const getToolSections = async (
  tradeId: string,
  userId: string
): Promise<ToolResponse<ToolSection[]>> => {
  try {
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

    return { success: true, data: sections };
  } catch (error) {
    console.error('Error getting tool sections:', error);
    return { success: false, error: 'Failed to fetch tool sections' };
  }
};

/**
 * Add a new tool section
 */
export const addToolSection = async (
  name: string,
  tradeId: string,
  userId: string
): Promise<ToolResponse<string>> => {
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

    // Create section
    const sectionRef = await addDoc(
      collection(db, TOOL_SECTIONS_COLLECTION),
      {
        name: name.trim(),
        tradeId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    return { success: true, data: sectionRef.id };
  } catch (error) {
    console.error('Error adding tool section:', error);
    return { success: false, error: 'Failed to add tool section' };
  }
};