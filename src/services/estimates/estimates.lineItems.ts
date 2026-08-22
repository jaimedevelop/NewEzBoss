// src/services/estimates/estimates.lineItems.ts

import { estimatesApiRequest, ApiError } from './estimatesApi';
import { apiLineItemToLineItem, type ApiLineItemRow } from './estimates.mapper';
import type {
  LineItem,
  LineItemUpdate,
  EstimateResponse
} from './estimates.types';

// ============================================================================
// ADD LINE ITEM
// ============================================================================

/**
 * Add a new line item to an estimate
 * Totals are recalculated and a revision recorded server-side.
 */
export async function addLineItem(
  estimateId: string,
  lineItem: Omit<LineItem, 'id'>,
  _userId: string,
  _userName: string
): Promise<EstimateResponse<LineItem>> {
  try {
    const row = await estimatesApiRequest<ApiLineItemRow>(`/estimates/${estimateId}/line-items`, {
      method: 'POST',
      body: JSON.stringify({
        description: lineItem.description,
        quantity: lineItem.quantity,
        unitPrice: lineItem.unitPrice,
        total: lineItem.total,
        notes: lineItem.notes ?? null,
        type: lineItem.type ?? null,
        itemId: lineItem.itemId ?? null,
        productId: lineItem.productId ? Number(lineItem.productId) : null,
        laborId: lineItem.laborId ? Number(lineItem.laborId) : null,
        groupId: lineItem.groupId ? Number(lineItem.groupId) : null,
        collectionId: lineItem.collectionId ? Number(lineItem.collectionId) : null,
        collectionName: lineItem.collectionName ?? null,
      }),
    });

    return { success: true, data: apiLineItemToLineItem(row) };
  } catch (error) {
    console.error('Error adding line item:', error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : 'Failed to add line item'
    };
  }
}

// ============================================================================
// UPDATE LINE ITEM
// ============================================================================

/**
 * Update an existing line item
 * Totals are recalculated and a revision recorded server-side.
 */
export async function updateLineItem(
  estimateId: string,
  lineItemId: string,
  updates: LineItemUpdate,
  _userId: string,
  _userName: string
): Promise<EstimateResponse<LineItem>> {
  try {
    const row = await estimatesApiRequest<ApiLineItemRow>(
      `/estimates/${estimateId}/line-items/${lineItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );

    return { success: true, data: apiLineItemToLineItem(row) };
  } catch (error) {
    console.error('Error updating line item:', error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : 'Failed to update line item'
    };
  }
}

// ============================================================================
// DELETE LINE ITEM
// ============================================================================

/**
 * Delete a line item from an estimate
 * Totals are recalculated and a revision recorded server-side.
 */
export async function deleteLineItem(
  estimateId: string,
  lineItemId: string,
  _userId: string,
  _userName: string
): Promise<EstimateResponse<void>> {
  try {
    await estimatesApiRequest<void>(`/estimates/${estimateId}/line-items/${lineItemId}`, {
      method: 'DELETE',
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting line item:', error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : 'Failed to delete line item'
    };
  }
}

// ============================================================================
// REORDER LINE ITEMS
// ============================================================================

/**
 * Reorder line items (for drag-and-drop). Records a revision but doesn't
 * affect totals.
 */
export async function reorderLineItems(
  estimateId: string,
  reorderedItems: LineItem[],
  _userId: string,
  _userName: string
): Promise<EstimateResponse<void>> {
  try {
    await estimatesApiRequest<ApiLineItemRow[]>(`/estimates/${estimateId}/line-items/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ lineItemIds: reorderedItems.map(item => Number(item.id)) }),
    });

    return { success: true };
  } catch (error) {
    console.error('Error reordering line items:', error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : 'Failed to reorder line items'
    };
  }
}
