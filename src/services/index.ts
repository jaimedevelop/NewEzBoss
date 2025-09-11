// Estimates operations
export {
  generateEstimateNumber,
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
  updateProduct,
  deleteProduct,
  updateProductStock,
  getLowStockProducts,
  getProductCategories,
  getProductSuppliers,
  bulkUpdateProducts,
  subscribeToProducts,
  isSkuUnique,
  getProductStats,
  type InventoryProduct,
  type ProductFilters,
  type ProductsResponse,
  type StockAlert,
} from './products';