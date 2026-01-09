// src/services/products/products.types.ts
import { Timestamp } from 'firebase/firestore';

/**
 * SKU entry interface for multiple supplier SKUs
 */
export interface SKUEntry {
  id: string;
  store: string;
  sku: string;
}

/**
 * Price entry interface for multiple store prices
 */
export interface PriceEntry {
  id: string;
  store: string;
  price: number;
  lastUpdated?: string;
}

/**
 * Main product interface matching ProductModal structure
 * Updated with Trade hierarchy: Trade → Section → Category → Subcategory → Type
 */
export interface InventoryProduct {
  id?: string;
  name: string;
  sku: string; // Deprecated in favor of SKUs array, but kept for backwards compatibility
  trade: string; // Top level of hierarchy (e.g., "Plumbing", "Electrical")
  section: string; // Second level (e.g., "Pipes", "Fixtures")
  category: string; // Third level (e.g., "Copper Pipes", "Toilets")
  subcategory: string; // Fourth level (e.g., "1/2 inch", "Two-piece")
  type: string; // Fifth level - formerly enum, now part of hierarchy
  size?: string;
  description: string;
  unit: string; // Unit of measurement (e.g., "each", "ft", "box")
  unitPrice: number; // Added for pricing calculations
  onHand: number; // Current quantity in inventory
  assigned: number; // Quantity assigned to projects
  available: number; // Calculated: onHand - assigned
  minStock: number; // Minimum stock alert threshold
  maxStock: number; // Maximum stock level
  supplier: string;
  location: string; // Physical storage location
  lastUpdated: string; // Date of last update (YYYY-MM-DD format)
  priceEntries?: PriceEntry[]; // Multiple store prices
  skus?: SKUEntry[]; // Multiple supplier SKUs
  barcode?: string;
  imageUrl?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  
  // Purchase history tracking
  purchaseHistory?: any[]; // PurchaseHistoryEntry[] - using any to avoid circular dependency
  lastPurchaseDate?: string; // YYYY-MM-DD format
  lastPurchasePrice?: number; // Most recent unit price paid
  lastPurchaseSupplier?: string; // Most recent supplier
}

/**
 * Filter interface for product queries
 * Supports hierarchical filtering through the trade structure
 */
export interface ProductFilters {
  trade?: string; // Filter by trade (top level)
  section?: string; // Filter by section
  category?: string; // Filter by category
  subcategory?: string; // Filter by subcategory
  type?: string; // Filter by type
  size?: string; // Filter by size
  supplier?: string; // Filter by supplier
  location?: string; // Filter by storage location
  lowStock?: boolean; // Show only low stock items
  outOfStock?: boolean; // Show only out of stock items
  inStock?: boolean; // Show only in stock items
  searchTerm?: string; // Text search across multiple fields
  sortBy?: 'name' | 'trade' | 'section' | 'category' | 'unitPrice' | 'onHand' | 'lastUpdated';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Stock alert interface for low inventory notifications
 */
export interface StockAlert {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  severity: 'low' | 'critical';
}

/**
 * Product statistics interface for dashboard
 */
export interface ProductStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  byTrade: Record<string, number>;
  bySection: Record<string, number>;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
}

/**
 * Bulk update interface
 */
export interface BulkProductUpdate {
  id: string;
  data: Partial<InventoryProduct>;
}