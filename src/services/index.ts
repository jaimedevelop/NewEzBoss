// Estimates operations
export {
  getNextEstimateNumber,
  createEstimate as createEstimateWithNumber,
  updateEstimate,
  getAllEstimates,
  getEstimatesByStatus,
  getEstimatesByProject,
  getEstimateById,
  updateEstimateStatus,
  duplicateEstimate,
  deleteEstimate,
  getEstimatesByDateRange,
  searchEstimatesByCustomer,
  type EstimateData,
  type EstimateWithId,
} from './estimates';

// Products operations
export {
  createProduct,
  getProduct,
  getProducts,
  getProductsPage,
  updateProduct,
  deleteProduct,
  updateProductStock,
  getLowStockProducts,
  bulkUpdateProducts,
  getProductStats,
  type InventoryProduct,
  type SKUEntry,
  type ProductFilters,
  type ProductsResponse,
  type StockAlert,
} from './inventory/products';

export * from './finances';
