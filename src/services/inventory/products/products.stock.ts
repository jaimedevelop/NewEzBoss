// src/services/products/products.stock.ts
import type { DatabaseResult } from '../../../firebase/database';
import { inventoryApiRequest, ApiError } from '../inventoryApi';

interface ProductRow {
  id: number;
  onHand: number;
  assigned: number;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

/**
 * Update product stock levels
 * Used for inventory adjustments, receiving shipments, etc.
 */
export const updateProductStock = async (
  productId: string,
  onHandChange: number,
  assignedChange: number = 0,
  _notes?: string
): Promise<DatabaseResult> => {
  try {
    await inventoryApiRequest<ProductRow>(`/inventory/products/${productId}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ onHandChange, assignedChange }),
    });

    console.log(`✅ Stock updated for product ${productId}: onHand change ${onHandChange}, assigned change ${assignedChange}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating product stock:', error);
    return { success: false, error: errorMessage(error, 'Failed to update product stock') };
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

    const row = await inventoryApiRequest<ProductRow>(`/inventory/products/${productId}`);
    const available = row.onHand - row.assigned;
    if (available < quantity) {
      return {
        success: false,
        error: `Insufficient quantity available. Available: ${available}, Requested: ${quantity}`,
      };
    }

    await inventoryApiRequest<ProductRow>(`/inventory/products/${productId}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ assignedChange: quantity }),
    });

    console.log(`✅ Assigned ${quantity} of product ${productId} to project ${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error assigning product to project:', error);
    return { success: false, error: errorMessage(error, 'Failed to assign product') };
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

    const row = await inventoryApiRequest<ProductRow>(`/inventory/products/${productId}`);
    if (row.assigned < quantity) {
      return {
        success: false,
        error: `Cannot return more than assigned. Assigned: ${row.assigned}, Requested: ${quantity}`,
      };
    }

    await inventoryApiRequest<ProductRow>(`/inventory/products/${productId}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ assignedChange: -quantity }),
    });

    console.log(`✅ Returned ${quantity} of product ${productId} from project ${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error returning product from project:', error);
    return { success: false, error: errorMessage(error, 'Failed to return product') };
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

    const row = await inventoryApiRequest<ProductRow>(`/inventory/products/${productId}`);
    if (row.onHand < quantity) {
      return {
        success: false,
        error: `Cannot remove more than on hand. On Hand: ${row.onHand}, Requested: ${quantity}`,
      };
    }

    await inventoryApiRequest<ProductRow>(`/inventory/products/${productId}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ onHandChange: -quantity }),
    });

    console.log(`✅ Adjusted stock for loss: product ${productId}, quantity ${quantity}, reason: ${reason}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error adjusting stock for loss:', error);
    return { success: false, error: errorMessage(error, 'Failed to adjust stock') };
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

    return await updateProductStock(productId, quantity, 0, notes);
  } catch (error) {
    console.error('❌ Error receiving shipment:', error);
    return { success: false, error: errorMessage(error, 'Failed to receive shipment') };
  }
};

/**
 * Transfer product between locations
 */
export const transferProductLocation = async (
  productId: string,
  newLocation: string,
  _notes?: string
): Promise<DatabaseResult> => {
  try {
    await inventoryApiRequest<ProductRow>(`/inventory/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ location: newLocation }),
    });

    console.log(`✅ Transferred product ${productId} to location: ${newLocation}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error transferring product location:', error);
    return { success: false, error: errorMessage(error, 'Failed to transfer product location') };
  }
};
