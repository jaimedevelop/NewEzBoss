// src/services/estimates/estimates.lineItems.ts

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type {
  LineItem,
  LineItemUpdate,
  Revision,
  RevisionChangeType,
  Estimate,
  EstimateResponse
} from './estimates.types';
import { calculateEstimateTotals, removeUndefined } from './estimates.utils';

const COLLECTION_NAME = 'estimates';

// ============================================================================
// HELPER: Record Revision
// ============================================================================

/**
 * Records a revision entry for tracking changes
 * Uses existing Revision schema with optional enhanced fields
 */
async function recordRevision(
  estimateId: string,
  changeType: RevisionChangeType,
  changes: string,
  userId: string,
  userName: string,
  previousTotal: number,
  newTotal: number,
  details?: any
): Promise<void> {
  try {
    const estimateRef = doc(db, COLLECTION_NAME, estimateId);
    const estimateSnap = await getDoc(estimateRef);

    if (!estimateSnap.exists()) {
      throw new Error('Estimate not found');
    }

    const currentData = estimateSnap.data() as Estimate;
    const currentRevision = currentData.currentRevision || 0;
    const revisions = currentData.revisionsHistory || [];

    // Create revision with FULL timestamp (not just date)
    const newRevision: Revision = {
      revisionNumber: currentRevision + 1,
      date: new Date().toISOString(), // Full ISO timestamp with time
      changes,
      modifiedBy: userId,
      previousTotal,
      newTotal,
      // Enhanced fields (optional, backward compatible)
      changeType,
      modifiedByName: userName,
      details
    };

    await updateDoc(estimateRef, removeUndefined({
      currentRevision: currentRevision + 1,
      revisionsHistory: [...revisions, newRevision],
      updatedAt: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Error recording revision:', error);
    throw error;
  }
}

// ============================================================================
// ADD LINE ITEM
// ============================================================================

/**
 * Add a new line item to an estimate
 * Automatically recalculates totals and records a revision
 */
export async function addLineItem(
  estimateId: string,
  lineItem: Omit<LineItem, 'id'>,
  userId: string,
  userName: string
): Promise<EstimateResponse<LineItem>> {
  try {
    const estimateRef = doc(db, COLLECTION_NAME, estimateId);
    const estimateSnap = await getDoc(estimateRef);

    if (!estimateSnap.exists()) {
      return { success: false, error: 'Estimate not found' };
    }

    const estimateData = estimateSnap.data() as Estimate;
    const previousTotal = estimateData.total;

    // Generate unique ID
    const newLineItem: LineItem = {
      ...lineItem,
      id: `li_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      total: lineItem.quantity * lineItem.unitPrice
    };

    // Add to line items array
    const updatedLineItems = [...(estimateData.lineItems || []), newLineItem];

    // Recalculate totals
    const calculations = calculateEstimateTotals(
      updatedLineItems,
      estimateData.discount,
      estimateData.discountType || 'fixed',
      estimateData.taxRate
    );

    // Update estimate
    await updateDoc(estimateRef, removeUndefined({
      lineItems: updatedLineItems,
      subtotal: calculations.subtotal,
      tax: calculations.tax,
      total: calculations.total,
      updatedAt: new Date().toISOString()
    }));

    // Record revision
    const revisionMessage = `Added line item: ${newLineItem.description} (${newLineItem.quantity}x @ $${newLineItem.unitPrice.toFixed(2)})`;
    await recordRevision(
      estimateId,
      'line_item_added',
      revisionMessage,
      userId,
      userName,
      previousTotal,
      calculations.total,
      { lineItemId: newLineItem.id }
    );

    return { success: true, data: newLineItem };

  } catch (error) {
    console.error('Error adding line item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add line item'
    };
  }
}

// ============================================================================
// UPDATE LINE ITEM
// ============================================================================

/**
 * Update an existing line item
 * Automatically recalculates totals and records a revision
 */
export async function updateLineItem(
  estimateId: string,
  lineItemId: string,
  updates: LineItemUpdate,
  userId: string,
  userName: string
): Promise<EstimateResponse<LineItem>> {
  try {
    const estimateRef = doc(db, COLLECTION_NAME, estimateId);
    const estimateSnap = await getDoc(estimateRef);

    if (!estimateSnap.exists()) {
      return { success: false, error: 'Estimate not found' };
    }

    const estimateData = estimateSnap.data() as Estimate;
    const previousTotal = estimateData.total;
    const lineItems = estimateData.lineItems || [];

    // Find and update the line item
    const itemIndex = lineItems.findIndex(item => item.id === lineItemId);
    if (itemIndex === -1) {
      return { success: false, error: 'Line item not found' };
    }

    const oldItem = lineItems[itemIndex];
    const updatedItem: LineItem = {
      ...oldItem,
      ...updates,
      total: (updates.quantity ?? oldItem.quantity) * (updates.unitPrice ?? oldItem.unitPrice)
    };

    const updatedLineItems = [...lineItems];
    updatedLineItems[itemIndex] = updatedItem;

    // Recalculate totals
    const calculations = calculateEstimateTotals(
      updatedLineItems,
      estimateData.discount,
      estimateData.discountType || 'fixed',
      estimateData.taxRate
    );

    // Update estimate
    await updateDoc(estimateRef, removeUndefined({
      lineItems: updatedLineItems,
      subtotal: calculations.subtotal,
      tax: calculations.tax,
      total: calculations.total,
      updatedAt: new Date().toISOString()
    }));

    // Build revision message
    const changes: string[] = [];
    if (updates.description && updates.description !== oldItem.description) {
      changes.push(`description: "${oldItem.description}" → "${updates.description}"`);
    }
    if (updates.quantity !== undefined && updates.quantity !== oldItem.quantity) {
      changes.push(`quantity: ${oldItem.quantity} → ${updates.quantity}`);
    }
    if (updates.unitPrice !== undefined && updates.unitPrice !== oldItem.unitPrice) {
      changes.push(`price: $${oldItem.unitPrice.toFixed(2)} → $${updates.unitPrice.toFixed(2)}`);
    }

    const revisionMessage = `Updated "${oldItem.description}": ${changes.join(', ')}`;
    await recordRevision(
      estimateId,
      'line_item_updated',
      revisionMessage,
      userId,
      userName,
      previousTotal,
      calculations.total,
      { lineItemId, updates }
    );

    return { success: true, data: updatedItem };

  } catch (error) {
    console.error('Error updating line item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update line item'
    };
  }
}

// ============================================================================
// DELETE LINE ITEM
// ============================================================================

/**
 * Delete a line item from an estimate
 * Automatically recalculates totals and records a revision
 */
export async function deleteLineItem(
  estimateId: string,
  lineItemId: string,
  userId: string,
  userName: string
): Promise<EstimateResponse<void>> {
  try {
    const estimateRef = doc(db, COLLECTION_NAME, estimateId);
    const estimateSnap = await getDoc(estimateRef);

    if (!estimateSnap.exists()) {
      return { success: false, error: 'Estimate not found' };
    }

    const estimateData = estimateSnap.data() as Estimate;
    const previousTotal = estimateData.total;
    const lineItems = estimateData.lineItems || [];

    // Find the item to delete
    const itemToDelete = lineItems.find(item => item.id === lineItemId);
    if (!itemToDelete) {
      return { success: false, error: 'Line item not found' };
    }

    // Remove the item
    const updatedLineItems = lineItems.filter(item => item.id !== lineItemId);

    // Recalculate totals
    const calculations = calculateEstimateTotals(
      updatedLineItems,
      estimateData.discount,
      estimateData.discountType || 'fixed',
      estimateData.taxRate
    );

    // Update estimate
    await updateDoc(estimateRef, removeUndefined({
      lineItems: updatedLineItems,
      subtotal: calculations.subtotal,
      tax: calculations.tax,
      total: calculations.total,
      updatedAt: new Date().toISOString()
    }));

    // Record revision
    const revisionMessage = `Deleted line item: ${itemToDelete.description} (${itemToDelete.quantity}x @ $${itemToDelete.unitPrice.toFixed(2)})`;
    await recordRevision(
      estimateId,
      'line_item_deleted',
      revisionMessage,
      userId,
      userName,
      previousTotal,
      calculations.total,
      { lineItemId, deletedItem: itemToDelete }
    );

    return { success: true };

  } catch (error) {
    console.error('Error deleting line item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete line item'
    };
  }
}

// ============================================================================
// REORDER LINE ITEMS
// ============================================================================

/**
 * Reorder line items (for future drag-and-drop functionality)
 * Records a revision but doesn't affect totals
 */
export async function reorderLineItems(
  estimateId: string,
  reorderedItems: LineItem[],
  userId: string,
  userName: string
): Promise<EstimateResponse<void>> {
  try {
    const estimateRef = doc(db, COLLECTION_NAME, estimateId);

    await updateDoc(estimateRef, removeUndefined({
      lineItems: reorderedItems,
      updatedAt: new Date().toISOString()
    }));

    // Record revision (no total change)
    const estimateSnap = await getDoc(estimateRef);
    const currentTotal = estimateSnap.exists() ? (estimateSnap.data() as Estimate).total : 0;

    await recordRevision(
      estimateId,
      'other',
      'Reordered line items',
      userId,
      userName,
      currentTotal,
      currentTotal
    );

    return { success: true };

  } catch (error) {
    console.error('Error reordering line items:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder line items'
    };
  }
}