// src/services/products/products.stock.ts
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import type { DatabaseResult } from '../../../firebase/database';
import { InventoryProduct } from './products.types';
import { COLLECTION_NAME, calculateAvailable, getTodayDate } from './products.utils';

/**
 * Update product stock levels
 * Used for inventory adjustments, receiving shipments, etc.
 */
export const updateProductStock = async (
  productId: string,
  onHandChange: number,
  assignedChange: number = 0,
  notes?: string
): Promise<DatabaseResult> => {
  try {
    const productRef = doc(db, COLLECTION_NAME, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return { success: false, error: 'Product not found' };
    }

    const currentData = productSnap.data() as InventoryProduct;
    
    // Calculate new values (prevent negative quantities)
    const newOnHand = Math.max(0, currentData.onHand + onHandChange);
    const newAssigned = Math.max(0, currentData.assigned + assignedChange);
    const newAvailable = calculateAvailable(newOnHand, newAssigned);

    await updateDoc(productRef, {
      onHand: newOnHand,
      assigned: newAssigned,
      available: newAvailable,
      lastUpdated: getTodayDate(),
      updatedAt: serverTimestamp(),
    });

    console.log(
      `✅ Stock updated for product ${productId}: onHand ${currentData.onHand} → ${newOnHand}, assigned ${currentData.assigned} → ${newAssigned}`
    );

    return { success: true };
  } catch (error) {
    console.error('❌ Error updating product stock:', error);
    return { success: false, error };
  }
};

/**
 * Assign product to a project
 * Reduces available quantity and increases assigned quantity
 */
export const assignProductToProject = async (
  productId: string,
  projectId: string,
  quantity: number
): Promise<DatabaseResult> => {
  try {
    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    const productRef = doc(db, COLLECTION_NAME, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return { success: false, error: 'Product not found' };
    }

    const currentData = productSnap.data() as InventoryProduct;
    const available = calculateAvailable(currentData.onHand, currentData.assigned);

    // Check if enough quantity is available
    if (available < quantity) {
      return {
        success: false,
        error: `Insufficient quantity available. Available: ${available}, Requested: ${quantity}`,
      };
    }

    const newAssigned = currentData.assigned + quantity;
    const newAvailable = calculateAvailable(currentData.onHand, newAssigned);

    await updateDoc(productRef, {
      assigned: newAssigned,
      available: newAvailable,
      lastUpdated: getTodayDate(),
      updatedAt: serverTimestamp(),
    });

    console.log(
      `✅ Assigned ${quantity} of product ${productId} to project ${projectId}`
    );

    return { success: true };
  } catch (error) {
    console.error('❌ Error assigning product to project:', error);
    return { success: false, error };
  }
};

/**
 * Return product from a project
 * Increases available quantity and decreases assigned quantity
 */
export const returnProductFromProject = async (
  productId: string,
  projectId: string,
  quantity: number
): Promise<DatabaseResult> => {
  try {
    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    const productRef = doc(db, COLLECTION_NAME, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return { success: false, error: 'Product not found' };
    }

    const currentData = productSnap.data() as InventoryProduct;

    // Check if trying to return more than assigned
    if (currentData.assigned < quantity) {
      return {
        success: false,
        error: `Cannot return more than assigned. Assigned: ${currentData.assigned}, Requested: ${quantity}`,
      };
    }

    const newAssigned = Math.max(0, currentData.assigned - quantity);
    const newAvailable = calculateAvailable(currentData.onHand, newAssigned);

    await updateDoc(productRef, {
      assigned: newAssigned,
      available: newAvailable,
      lastUpdated: getTodayDate(),
      updatedAt: serverTimestamp(),
    });

    console.log(
      `✅ Returned ${quantity} of product ${productId} from project ${projectId}`
    );

    return { success: true };
  } catch (error) {
    console.error('❌ Error returning product from project:', error);
    return { success: false, error };
  }
};

/**
 * Adjust stock for damage, theft, or other losses
 */
export const adjustStockForLoss = async (
  productId: string,
  quantity: number,
  reason: string
): Promise<DatabaseResult> => {
  try {
    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    const productRef = doc(db, COLLECTION_NAME, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return { success: false, error: 'Product not found' };
    }

    const currentData = productSnap.data() as InventoryProduct;

    if (currentData.onHand < quantity) {
      return {
        success: false,
        error: `Cannot remove more than on hand. On Hand: ${currentData.onHand}, Requested: ${quantity}`,
      };
    }

    const newOnHand = Math.max(0, currentData.onHand - quantity);
    const newAvailable = calculateAvailable(newOnHand, currentData.assigned);

    await updateDoc(productRef, {
      onHand: newOnHand,
      available: newAvailable,
      lastUpdated: getTodayDate(),
      updatedAt: serverTimestamp(),
    });

    console.log(
      `✅ Adjusted stock for loss: product ${productId}, quantity ${quantity}, reason: ${reason}`
    );

    return { success: true };
  } catch (error) {
    console.error('❌ Error adjusting stock for loss:', error);
    return { success: false, error };
  }
};

/**
 * Receive shipment and add to stock
 */
export const receiveShipment = async (
  productId: string,
  quantity: number,
  notes?: string
): Promise<DatabaseResult> => {
  try {
    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    // Use the updateProductStock function with positive onHandChange
    return await updateProductStock(productId, quantity, 0, notes);
  } catch (error) {
    console.error('❌ Error receiving shipment:', error);
    return { success: false, error };
  }
};

/**
 * Transfer product between locations
 */
export const transferProductLocation = async (
  productId: string,
  newLocation: string,
  notes?: string
): Promise<DatabaseResult> => {
  try {
    const productRef = doc(db, COLLECTION_NAME, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return { success: false, error: 'Product not found' };
    }

    await updateDoc(productRef, {
      location: newLocation,
      lastUpdated: getTodayDate(),
      updatedAt: serverTimestamp(),
    });

    console.log(
      `✅ Transferred product ${productId} to location: ${newLocation}`
    );

    return { success: true };
  } catch (error) {
    console.error('❌ Error transferring product location:', error);
    return { success: false, error };
  }
};