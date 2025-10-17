// src/services/labor/labor.mutations.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { LaborItem, LaborResponse } from './labor.types';

const LABOR_COLLECTION = 'labor_items';

/**
 * Create a new labor item
 */
export const createLaborItem = async (
  laborData: Partial<LaborItem>,
  userId: string
): Promise<LaborResponse<string>> => {
  try {
    const docRef = await addDoc(collection(db, LABOR_COLLECTION), {
      ...laborData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { success: true, data: docRef.id };
  } catch (error) {
    console.error('Error creating labor item:', error);
    return { success: false, error: 'Failed to create labor item' };
  }
};

/**
 * Update an existing labor item
 */
export const updateLaborItem = async (
  laborId: string,
  laborData: Partial<LaborItem>
): Promise<LaborResponse<void>> => {
  try {
    const laborRef = doc(db, LABOR_COLLECTION, laborId);
    await updateDoc(laborRef, {
      ...laborData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating labor item:', error);
    return { success: false, error: 'Failed to update labor item' };
  }
};

/**
 * Delete a labor item
 */
export const deleteLaborItem = async (
  laborId: string
): Promise<LaborResponse<void>> => {
  try {
    const laborRef = doc(db, LABOR_COLLECTION, laborId);
    await deleteDoc(laborRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting labor item:', error);
    return { success: false, error: 'Failed to delete labor item' };
  }
};

/**
 * Toggle labor item active status
 */
export const toggleLaborItemStatus = async (
  laborId: string,
  isActive: boolean
): Promise<LaborResponse<void>> => {
  try {
    const laborRef = doc(db, LABOR_COLLECTION, laborId);
    await updateDoc(laborRef, {
      isActive,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling labor item status:', error);
    return { success: false, error: 'Failed to toggle labor item status' };
  }
};