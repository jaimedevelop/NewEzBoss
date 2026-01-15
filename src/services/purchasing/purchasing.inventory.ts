// src/services/purchasing/purchasing.inventory.ts

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { DatabaseResult } from '../../firebase/database';
import type { Estimate } from '../estimates/estimates.types';
import type { InventoryProduct } from '../inventory/products/products.types';
import type {
  PurchaseOrderData,
  PurchaseOrderItem,
  ReceiveItemData,
  PurchaseHistoryEntry
} from './purchasing.types';
import { updateProductStock } from '../inventory/products/products.stock';

const PRODUCTS_COLLECTION = 'products';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Generate unique ID for purchase history entries
 */
const generateHistoryId = (): string => {
  return `ph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================================================
// P.O. GENERATION FROM ESTIMATE
// ============================================================================

/**
 * Generate purchase order from approved estimate
 * Compares estimate line items against inventory and creates P.O. for shortfalls
 */
export const generatePOFromEstimate = async (
  estimate: Estimate
): Promise<DatabaseResult<PurchaseOrderData | null>> => {
  try {
    console.log('🔍 [PO Generation] Starting for estimate:', estimate.estimateNumber);

    if (!estimate.id) {
      console.error('❌ [PO Generation] Estimate ID is missing');
      return { success: false, error: 'Estimate ID is required' };
    }

    console.log('📋 [PO Generation] Total line items:', estimate.lineItems.length);

    // Filter for product line items only
    const productLineItems = estimate.lineItems.filter(
      item => item.type === 'product' && item.productId
    );

    console.log('🏷️ [PO Generation] Product line items:', productLineItems.length);
    console.log('🏷️ [PO Generation] Line items detail:', estimate.lineItems.map(item => ({
      description: item.description,
      type: item.type,
      hasProductId: !!item.productId,
      productId: item.productId,
      quantity: item.quantity
    })));

    if (productLineItems.length === 0) {
      console.log('ℹ️ [PO Generation] No product line items in estimate, no P.O. needed');
      return { success: true, data: null };
    }

    const poItems: PurchaseOrderItem[] = [];

    // Check each product against inventory
    for (const lineItem of productLineItems) {
      const productId = lineItem.productId;

      console.log(`\n🔍 [PO Generation] Checking product: ${lineItem.description}`);
      console.log(`   Product ID: ${productId}`);
      console.log(`   Quantity needed: ${lineItem.quantity}`);

      if (!productId) {
        console.log('⚠️ [PO Generation] Product has no ID - adding to PO as non-inventory item');
        // Product not in inventory - flag it
        poItems.push({
          id: `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productId: undefined,
          productName: lineItem.description,
          quantityNeeded: lineItem.quantity,
          quantityOrdered: lineItem.quantity,
          unitPrice: lineItem.unitPrice,
          totalCost: lineItem.total,
          quantityReceived: 0,
          isReceived: false,
          notInInventory: true,
          notes: 'Item not found in inventory system',
        });
        continue;
      }

      // Fetch product from inventory
      const productRef = doc(db, PRODUCTS_COLLECTION, productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        console.log('⚠️ [PO Generation] Product not found in database - adding to PO');
        // Product ID exists but not found - flag it
        poItems.push({
          id: `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productId: productId,
          productName: lineItem.description,
          quantityNeeded: lineItem.quantity,
          quantityOrdered: lineItem.quantity,
          unitPrice: lineItem.unitPrice,
          totalCost: lineItem.total,
          quantityReceived: 0,
          isReceived: false,
          notInInventory: true,
          notes: 'Product not found in inventory',
        });
        continue;
      }

      const product = productSnap.data() as InventoryProduct;
      const availableStock = product.available || 0;
      const quantityNeeded = lineItem.quantity;

      // Extract unit price with fallback logic (same as getItemPrice in estimates.inventory.ts)
      const unitPrice = product.priceEntries?.[0]?.price || product.unitPrice || 0;

      console.log(`   📦 Stock info for "${product.name}":`);
      console.log(`      - On hand: ${product.onHand}`);
      console.log(`      - Assigned: ${product.assigned}`);
      console.log(`      - Available: ${availableStock}`);
      console.log(`      - Quantity needed: ${quantityNeeded}`);
      console.log(`      - Unit price: $${unitPrice} (from ${product.priceEntries?.[0]?.price ? 'priceEntries' : product.unitPrice ? 'unitPrice' : 'default 0'})`);

      // Calculate shortfall
      const shortfall = quantityNeeded - availableStock;
      console.log(`      - Shortfall: ${shortfall}`);

      if (shortfall > 0) {
        console.log(`   ✅ [PO Generation] Adding to PO - need to order ${shortfall} units at $${unitPrice} each`);
        // Need to order more
        poItems.push({
          id: `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productId: productId,
          productName: product.name,
          sku: product.sku,
          quantityNeeded: quantityNeeded,
          quantityOrdered: shortfall,
          unitPrice: unitPrice,
          totalCost: shortfall * unitPrice,
          quantityReceived: 0,
          isReceived: false,
          notInInventory: false,
        });
      } else {
        console.log(`   ℹ️ [PO Generation] Sufficient stock - not adding to PO`);
      }
    }

    console.log(`\n📊 [PO Generation] Summary: ${poItems.length} items need ordering`);

    // If no items need ordering, return null
    if (poItems.length === 0) {
      console.log('✅ [PO Generation] All products in stock, no P.O. needed');
      return { success: true, data: null };
    }

    // Calculate totals
    const subtotal = poItems.reduce((sum, item) => sum + item.totalCost, 0);
    const taxRate = estimate.taxRate || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    console.log(`💰 [PO Generation] Totals - Subtotal: $${subtotal.toFixed(2)}, Tax: $${tax.toFixed(2)}, Total: $${total.toFixed(2)}`);

    // Create P.O. data (without ID and poNumber - those are generated on save)
    const poData: PurchaseOrderData = {
      estimateId: estimate.id,
      estimateNumber: estimate.estimateNumber,
      status: 'pending',
      items: poItems,
      orderDate: getTodayDate(),
      subtotal,
      tax,
      taxRate,
      total,
      notes: `Auto-generated from estimate ${estimate.estimateNumber}`,
    };

    console.log(`✅ [PO Generation] Generated P.O. with ${poItems.length} items (total: $${total.toFixed(2)})`);
    return { success: true, data: poData };
  } catch (error) {
    console.error('❌ [PO Generation] Error generating P.O. from estimate:', error);
    return { success: false, error };
  }
};

// ============================================================================
// INVENTORY UPDATES FROM P.O.
// ============================================================================

/**
 * Update inventory when P.O. items are received
 * Updates stock levels, pricing, and purchase history
 */
export const updateInventoryFromPO = async (
  poId: string,
  receivedItems: ReceiveItemData[],
  receivedStore?: string
): Promise<DatabaseResult> => {
  try {
    // Import here to avoid circular dependency
    const { getPurchaseOrderById } = await import('./purchasing.queries');

    // Get the P.O. to access item details
    const poResult = await getPurchaseOrderById(poId);
    if (!poResult.success || !poResult.data) {
      return { success: false, error: 'Purchase order not found' };
    }

    const po = poResult.data;
    const errors: string[] = [];

    // Process each received item
    for (const receivedItem of receivedItems) {
      const poItem = po.items.find(item => item.id === receivedItem.itemId);

      if (!poItem) {
        errors.push(`Item ${receivedItem.itemId} not found in P.O.`);
        continue;
      }

      // Skip items not in inventory
      if (poItem.notInInventory || !poItem.productId) {
        console.log(`ℹ️ Skipping inventory update for ${poItem.productName} (not in inventory)`);
        continue;
      }

      // Update product stock
      const stockResult = await updateProductStock(
        poItem.productId,
        receivedItem.quantityReceived,
        0,
        `Received from P.O. ${po.poNumber}`
      );

      if (!stockResult.success) {
        errors.push(`Failed to update stock for ${poItem.productName}: ${stockResult.error}`);
        continue;
      }

      // Update product pricing and purchase history
      const priceResult = await updateProductPricing(
        poItem.productId,
        receivedItem.actualUnitPrice,
        po.poNumber,
        poId,
        receivedItem.quantityReceived,
        receivedStore || po.supplier
      );

      if (!priceResult.success) {
        errors.push(`Failed to update pricing for ${poItem.productName}: ${priceResult.error}`);
      }
    }

    if (errors.length > 0) {
      console.error('⚠️ Some inventory updates failed:', errors);
      return { success: false, error: errors.join('; ') };
    }

    console.log(`✅ Inventory updated for ${receivedItems.length} items`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating inventory from P.O.:', error);
    return { success: false, error };
  }
};

/**
 * Update product pricing and purchase history
 */
const updateProductPricing = async (
  productId: string,
  actualUnitPrice: number,
  poNumber: string,
  poId: string,
  quantity: number,
  supplier?: string
): Promise<DatabaseResult> => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return { success: false, error: 'Product not found' };
    }

    const product = productSnap.data() as InventoryProduct;

    // Create new purchase history entry
    const newHistoryEntry: PurchaseHistoryEntry = {
      id: generateHistoryId(),
      poId: poId,
      poNumber: poNumber,
      purchaseDate: getTodayDate(),
      quantity: quantity,
      unitPrice: actualUnitPrice,
      totalCost: quantity * actualUnitPrice,
      supplier: supplier,
    };

    // Add to purchase history array
    const updatedHistory = [
      ...(product.purchaseHistory || []),
      newHistoryEntry,
    ];

    // Update product with new pricing and history
    await updateDoc(productRef, {
      unitPrice: actualUnitPrice,
      lastPurchaseDate: getTodayDate(),
      lastPurchasePrice: actualUnitPrice,
      lastPurchaseSupplier: supplier || null,
      purchaseHistory: updatedHistory,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Updated pricing for product ${productId}: $${actualUnitPrice}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating product pricing:', error);
    return { success: false, error };
  }
};

// ============================================================================
// PURCHASE HISTORY QUERIES
// ============================================================================

/**
 * Get purchase history for a specific product
 */
export const getProductPurchaseHistory = async (
  productId: string
): Promise<DatabaseResult<PurchaseHistoryEntry[]>> => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return { success: false, error: 'Product not found' };
    }

    const product = productSnap.data() as InventoryProduct;
    const history = product.purchaseHistory || [];

    // Sort by date (most recent first)
    const sortedHistory = [...history].sort((a, b) =>
      b.purchaseDate.localeCompare(a.purchaseDate)
    );

    return { success: true, data: sortedHistory };
  } catch (error) {
    console.error('❌ Error getting purchase history:', error);
    return { success: false, error };
  }
};
