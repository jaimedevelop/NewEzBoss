// src/services/inventory/tools/tool.mutations.ts

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { ToolItem, ToolResponse } from './tool.types';

const TOOL_COLLECTION = 'tool_items';

/**
 * Create a new tool item
 */
export const createToolItem = async (
  toolData: Partial<ToolItem>,
  userId: string
): Promise<ToolResponse<string>> => {
  try {
    const docRef = await addDoc(collection(db, TOOL_COLLECTION), {
      ...toolData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { success: true, data: docRef.id };
  } catch (error) {
    console.error('Error creating tool:', error);
    return { success: false, error: 'Failed to create tool' };
  }
};

/**
 * Update an existing tool item
 */
export const updateToolItem = async (
  toolId: string,
  toolData: Partial<ToolItem>
): Promise<ToolResponse<void>> => {
  try {
    const toolRef = doc(db, TOOL_COLLECTION, toolId);
    await updateDoc(toolRef, {
      ...toolData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating tool:', error);
    return { success: false, error: 'Failed to update tool' };
  }
};

/**
 * Delete a tool item
 */
export const deleteToolItem = async (
  toolId: string
): Promise<ToolResponse<void>> => {
  try {
    const toolRef = doc(db, TOOL_COLLECTION, toolId);
    await deleteDoc(toolRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting tool:', error);
    return { success: false, error: 'Failed to delete tool' };
  }
};

/**
 * Update tool status
 */
export const updateToolStatus = async (
  toolId: string,
  status: 'available' | 'in-use' | 'maintenance'
): Promise<ToolResponse<void>> => {
  try {
    const toolRef = doc(db, TOOL_COLLECTION, toolId);
    await updateDoc(toolRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating tool status:', error);
    return { success: false, error: 'Failed to update tool status' };
  }
};