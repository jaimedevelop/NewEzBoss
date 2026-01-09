// src/services/purchasing/purchasing.mutations.ts

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { DatabaseResult } from '../../firebase/database';
import type { 
  PurchaseOrder, 
  PurchaseOrderData,
  PurchaseOrderStatus,
  ReceiveItemData,
  PurchaseOrderItem
} from './purchasing.types';

const COLLECTION_NAME = 'purchaseOrders';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate sequential P.O. number (format: PO-YYYY-###)
 */
export const generatePONumber = async (): Promise<string> => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `PO-${currentYear}-`;

    // Query for the highest PO number this year
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('poNumber', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return `${prefix}001`;
    }

    const lastPO = snapshot.docs[0].data() as PurchaseOrder;
    const lastNumber = lastPO.poNumber;

    // Extract number from last PO (e.g., "PO-2026-005" -> 5)
    if (lastNumber.startsWith(prefix)) {
      const numPart = parseInt(lastNumber.split('-')[2], 10);
      const nextNum = (numPart + 1).toString().padStart(3, '0');
      return `${prefix}${nextNum}`;
    }

    // Fallback if format doesn't match
    return `${prefix}001`;
  } catch (error) {
    console.error('❌ Error generating PO number:', error);
    // Fallback to timestamp-based number
    return `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  }
};

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new purchase order
 */
export const createPurchaseOrder = async (
  poData: PurchaseOrderData
): Promise<DatabaseResult<string>> => {
  try {
    const poNumber = await generatePONumber();

    const newPO: any = {
      ...poData,
      poNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), newPO);

    console.log(`✅ Purchase order created: ${poNumber} (${docRef.id})`);
    return { success: true, data: docRef.id };
  } catch (error) {
    console.error('❌ Error creating purchase order:', error);
    return { success: false, error };
  }
};

/**
 * Update an existing purchase order
 */
export const updatePurchaseOrder = async (
  poId: string,
  updates: Partial<PurchaseOrder>
): Promise<DatabaseResult> => {
  try {
    const poRef = doc(db, COLLECTION_NAME, poId);

    await updateDoc(poRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Purchase order updated: ${poId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating purchase order:', error);
    return { success: false, error };
  }
};

/**
 * Update purchase order status
 */
export const updatePOStatus = async (
  poId: string,
  newStatus: PurchaseOrderStatus
): Promise<DatabaseResult> => {
  try {
    const updates: Partial<PurchaseOrder> = {
      status: newStatus,
    };

    // If marking as received, set received date
    if (newStatus === 'received') {
      updates.receivedDate = getTodayDate();
    }

    return await updatePurchaseOrder(poId, updates);
  } catch (error) {
    console.error('❌ Error updating PO status:', error);
    return { success: false, error };
  }
};

/**
 * Mark individual item as received
 */
export const markItemAsReceived = async (
  _poId: string,
  _itemId: string,
  _quantityReceived: number,
  _actualUnitPrice: number
): Promise<DatabaseResult> => {
  try {
    // This function would need to fetch the PO, update the specific item,
    // recalculate totals, and save. For now, we'll use the batch receive function.
    console.warn('⚠️ Use markPOAsReceived for receiving items');
    return { success: false, error: 'Use markPOAsReceived instead' };
  } catch (error) {
    console.error('❌ Error marking item as received:', error);
    return { success: false, error };
  }
};

/**
 * Mark purchase order as received (full or partial)
 * This is the main function for receiving P.O. items
 */
export const markPOAsReceived = async (
  poId: string,
  receivedItems: ReceiveItemData[]
): Promise<DatabaseResult> => {
  try {
    // Import here to avoid circular dependency
    const { getPurchaseOrderById } = await import('./purchasing.queries');
    const { updateInventoryFromPO } = await import('./purchasing.inventory');

    // Get current PO
    const poResult = await getPurchaseOrderById(poId);
    if (!poResult.success || !poResult.data) {
      return { success: false, error: 'Purchase order not found' };
    }

    const po = poResult.data;
    const updatedItems: PurchaseOrderItem[] = po.items.map((item: PurchaseOrderItem) => {
      const receivedData = receivedItems.find(r => r.itemId === item.id);
      
      if (receivedData) {
        return {
          ...item,
          quantityReceived: item.quantityReceived + receivedData.quantityReceived,
          actualUnitPrice: receivedData.actualUnitPrice,
          receivedDate: getTodayDate(),
          isReceived: (item.quantityReceived + receivedData.quantityReceived) >= item.quantityOrdered,
        };
      }
      
      return item;
    });

    // Determine new status
    const allReceived = updatedItems.every(item => item.isReceived);
    const someReceived = updatedItems.some(item => item.quantityReceived > 0);
    
    let newStatus: PurchaseOrderStatus = po.status;
    if (allReceived) {
      newStatus = 'received';
    } else if (someReceived) {
      newStatus = 'partially-received';
    }

    // Update PO
    const updateResult = await updatePurchaseOrder(poId, {
      items: updatedItems,
      status: newStatus,
      receivedDate: allReceived ? getTodayDate() : undefined,
    });

    if (!updateResult.success) {
      return updateResult;
    }

    // Update inventory for received items
    const inventoryResult = await updateInventoryFromPO(poId, receivedItems);
    if (!inventoryResult.success) {
      console.error('⚠️ PO updated but inventory update failed:', inventoryResult.error);
    }

    console.log(`✅ Purchase order ${po.poNumber} marked as ${newStatus}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error marking PO as received:', error);
    return { success: false, error };
  }
};

/**
 * Cancel a purchase order
 */
export const cancelPurchaseOrder = async (
  poId: string,
  reason?: string
): Promise<DatabaseResult> => {
  try {
    const updates: Partial<PurchaseOrder> = {
      status: 'cancelled',
      cancellationReason: reason,
    };

    return await updatePurchaseOrder(poId, updates);
  } catch (error) {
    console.error('❌ Error cancelling purchase order:', error);
    return { success: false, error };
  }
};
