// src/services/collections/index.ts
// Central barrel export for collections service

// ===== TYPES =====
export type {
  CollectionContentType,
  CategorySelection,
  CategoryTab,
  ItemSelection,
  AssignedProduct,
  Collection,
  CollectionFilters,
  DatabaseResult,
  CollectionStats,
  PaginatedCollectionResponse,
  CollectionResponse
} from './collections.types';

// ===== QUERIES =====
export {
  getCollection,
  getCollections,
  getCollectionsByCategory,
  searchCollections,
  subscribeToCollections,
} from './collections.queries';

// ===== MUTATIONS =====
export {
  createCollection,
  updateCollection,
  deleteCollection,
  duplicateCollection,
  updateCollectionMetadata,
  updateCollectionTaxRate,
  batchUpdateCollections,
  updateCollectionCategories
} from './collections.mutations';

// ===== PRODUCTS =====
export {
  updateProductSelection,
  batchUpdateProductSelections,
  getProductsForCollectionTabs,
  addProductCategoryTab,
  removeProductCategoryTab,
} from './collections.products';

// ===== LABOR =====
export {
  updateLaborSelection,
  batchUpdateLaborSelections,
  getLaborItemsForCollectionTabs,
  addLaborCategoryTab,
  removeLaborCategoryTab,
} from './collections.labor';

// ===== TOOLS =====
export {
  updateToolSelection,
  batchUpdateToolSelections,
  getToolsForCollectionTabs,
  addToolCategoryTab,
  removeToolCategoryTab,
} from './collections.tools';

// ===== EQUIPMENT =====
export {
  updateEquipmentSelection,
  batchUpdateEquipmentSelections,
  getEquipmentForCollectionTabs,
  addEquipmentCategoryTab,
  removeEquipmentCategoryTab,
} from './collections.equipment';

// ===== STATS =====
export {
  getCollectionsStats,
} from './collections.stats';

// ============================================================
// 🚧 TEMPORARY EXPORTS - ACCOUNTING SECTION - TO BE MOVED LATER 🚧
// ============================================================

export type {
  CalculatorRow,
  CollectionCalculation
} from './collections.types';

export {
  saveCollectionCalculation,
  clearCollectionCalculation
} from './collections.calculations';

// ============================================================
// 🚧 END TEMPORARY EXPORTS - ACCOUNTING SECTION 🚧
// ============================================================

// Default export for backwards compatibility
import * as collectionsService from './collections.queries';
export default collectionsService;