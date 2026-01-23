// src/services/purchasing/purchasing.types.ts

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// PURCHASE ORDER ITEMS
// ============================================================================

/**
 * Individual line item in a purchase order
 */
export interface PurchaseOrderItem {
  id: string;
  productId?: string;              // Link to inventory product (optional - may not exist)
  productName: string;              // Product name from estimate
  sku?: string;                     // SKU if available
  quantityNeeded: number;           // Total quantity needed for estimate
  quantityOrdered: number;          // Quantity to order (may differ from needed)
  unitPrice: number;                // Expected unit price
  totalCost: number;                // quantityOrdered * unitPrice

  // Receiving tracking
  quantityReceived: number;         // How much has been received
  actualUnitPrice?: number;         // Actual price paid (set when received)
  receivedDate?: string;            // YYYY-MM-DD format
  isReceived: boolean;              // Fully received flag

  // Flags
  notInInventory?: boolean;         // Flag for items not found in inventory
  isAvailable?: boolean;            // Flag for items already in stock
  notes?: string;
}

// ============================================================================
// PURCHASE ORDER
// ============================================================================

/**
 * Purchase order status
 */
export type PurchaseOrderStatus =
  | 'pending'              // Created but not yet ordered
  | 'ordered'              // Order placed with supplier
  | 'partially-received'   // Some items received
  | 'received'             // All items received
  | 'cancelled';           // Order cancelled

/**
 * Main purchase order interface
 */
export interface PurchaseOrder {
  id?: string;
  poNumber: string;                 // Auto-generated (e.g., "PO-2026-001")

  // Links
  estimateId: string;               // Originating estimate
  estimateNumber: string;           // For display

  // Status
  status: PurchaseOrderStatus;

  // Items
  items: PurchaseOrderItem[];

  // Supplier info (optional - can be mixed suppliers)
  supplier?: string;
  supplierContact?: string;

  // Dates
  orderDate?: string;               // YYYY-MM-DD format
  expectedDeliveryDate?: string;    // YYYY-MM-DD format
  receivedDate?: string;            // YYYY-MM-DD format (when fully received)

  // Financials
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;

  // Additional info
  notes?: string;
  cancellationReason?: string;

  // Metadata
  createdBy?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

// ============================================================================
// PURCHASE HISTORY
// ============================================================================

/**
 * Purchase history entry for tracking product purchases
 * Stored in the product document for quick access
 */
export interface PurchaseHistoryEntry {
  id: string;
  poId: string;                     // Link to purchase order
  poNumber: string;                 // For display
  purchaseDate: string;             // YYYY-MM-DD format
  quantity: number;                 // Quantity purchased
  unitPrice: number;                // Price paid per unit
  totalCost: number;                // quantity * unitPrice
  supplier?: string;
}

// ============================================================================
// FILTERS & QUERIES
// ============================================================================

/**
 * Filters for querying purchase orders
 */
export interface PurchaseOrderFilters {
  status?: PurchaseOrderStatus | PurchaseOrderStatus[];
  estimateId?: string;
  supplier?: string;
  dateFrom?: string;                // YYYY-MM-DD format
  dateTo?: string;                  // YYYY-MM-DD format
  searchTerm?: string;              // Search PO number, estimate number, supplier
  sortBy?: 'orderDate' | 'poNumber' | 'total' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Data for creating a new purchase order (without auto-generated fields)
 */
export interface PurchaseOrderData extends Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'poNumber'> {
  // All other fields required
}

/**
 * Purchase order with guaranteed ID field
 */
export interface PurchaseOrderWithId extends PurchaseOrder {
  id: string;
}

/**
 * Data for receiving items
 */
export interface ReceiveItemData {
  itemId: string;
  quantityReceived: number;
  actualUnitPrice: number;
  receivedStore?: string;
}

/**
 * Standard response wrapper for service functions
 */
export interface PurchaseOrderResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Statistics for purchase orders
 */
export interface PurchaseOrderStats {
  totalPOs: number;
  pendingCount: number;
  orderedCount: number;
  receivedCount: number;
  totalValue: number;
  pendingValue: number;
}
