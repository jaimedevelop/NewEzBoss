// src/services/purchasing/index.ts

// Types
export * from './purchasing.types';

// Mutations
export {
  generatePONumber,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePOStatus,
  markItemAsReceived,
  markPOAsReceived,
  cancelPurchaseOrder,
} from './purchasing.mutations';

// Queries
export {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseOrdersByEstimate,
  getPurchaseOrdersByProduct,
  getPendingPurchaseOrders,
  getRecentPurchaseOrders,
  getPurchaseOrderStats,
  subscribeToPurchaseOrders,
} from './purchasing.queries';

// Inventory Integration
export {
  generatePOFromEstimate,
  updateInventoryFromPO,
  getProductPurchaseHistory,
} from './purchasing.inventory';
