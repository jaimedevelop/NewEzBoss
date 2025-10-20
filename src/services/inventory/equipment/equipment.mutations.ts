// src/services/inventory/equipment/equipment.mutations.ts

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { EquipmentItem, EquipmentResponse } from './equipment.types';

const EQUIPMENT_COLLECTION = 'equipment_items';

/**
 * Create a new equipment item
 */
export const createEquipmentItem = async (
  equipmentData: Partial<EquipmentItem>,
  userId: string
): Promise<EquipmentResponse<string>> => {
  try {
    const docRef = await addDoc(collection(db, EQUIPMENT_COLLECTION), {
      ...equipmentData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { success: true, data: docRef.id };
  } catch (error) {
    console.error('Error creating equipment:', error);
    return { success: false, error: 'Failed to create equipment' };
  }
};

/**
 * Update an existing equipment item
 */
export const updateEquipmentItem = async (
  equipmentId: string,
  equipmentData: Partial<EquipmentItem>
): Promise<EquipmentResponse<void>> => {
  try {
    const equipmentRef = doc(db, EQUIPMENT_COLLECTION, equipmentId);
    await updateDoc(equipmentRef, {
      ...equipmentData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating equipment:', error);
    return { success: false, error: 'Failed to update equipment' };
  }
};

/**
 * Delete an equipment item
 */
export const deleteEquipmentItem = async (
  equipmentId: string
): Promise<EquipmentResponse<void>> => {
  try {
    const equipmentRef = doc(db, EQUIPMENT_COLLECTION, equipmentId);
    await deleteDoc(equipmentRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting equipment:', error);
    return { success: false, error: 'Failed to delete equipment' };
  }
};

/**
 * Update equipment status
 */
export const updateEquipmentStatus = async (
  equipmentId: string,
  status: 'available' | 'in-use' | 'maintenance'
): Promise<EquipmentResponse<void>> => {
  try {
    const equipmentRef = doc(db, EQUIPMENT_COLLECTION, equipmentId);
    await updateDoc(equipmentRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating equipment status:', error);
    return { success: false, error: 'Failed to update equipment status' };
  }
};