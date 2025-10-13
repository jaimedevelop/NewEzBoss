// src/services/products/index.ts
/**
 * Products Module - Barrel Export
 * 
 * This file exports all product-related functions, types, and utilities
 * from a single entry point for easy importing throughout the application.
 * 
 * Usage:
 *   import { getProduct, createProduct, InventoryProduct } from '@/services/products';
 */

// ===== TYPES =====
// All TypeScript interfaces and types
export type {
  SKUEntry,
  PriceEntry,
  InventoryProduct,
  ProductFilters,
  ProductsResponse,
  StockAlert,
  ProductStats,
  BulkProductUpdate,
} from './products.types';

// ===== UTILITIES =====
// Helper functions and constants
export {
  COLLECTION_NAME,
  calculateAvailable,
  validateProductData,
  normalizeSearchTerm,
  matchesSearchTerm,
  formatProductForDisplay,
  getPrimarySKU,
  isLowStock,
  isOutOfStock,
  isInStock,
  getStockSeverity,
  calculateProductValue,
  getTodayDate,
} from './products.utils';

// ===== QUERIES =====
// Read operations
export {
  getProduct,
  getProducts,
  getProductsByCategories,
  getLowStockProducts,
} from './products.queries';

// ===== MUTATIONS =====
// Write operations (Create, Update, Delete)
export {
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateProducts,
  duplicateProduct,
} from './products.mutations';

// ===== STOCK MANAGEMENT =====
// Inventory stock operations
export {
  updateProductStock,
  assignProductToProject,
  returnProductFromProject,
  adjustStockForLoss,
  receiveShipment,
  transferProductLocation,
} from './products.stock';

// ===== STATISTICS =====
// Analytics and reporting
export {
  getProductStats,
  getInventoryValue,
  getProductsByTrade,
  getProductsByCategory,
  getLowStockSummary,
  getReorderList,
  getTopProductsByValue,
} from './products.stats';

// ===== SUBSCRIPTIONS =====
// Real-time listeners
export {
  subscribeToProducts,
  subscribeToProduct,
  subscribeToLowStock,
  subscribeToProductsByTrade,
  subscribeToProductsByCategory,
  createManagedSubscription,
} from './products.subscriptions';
