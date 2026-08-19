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
  CollectionResponse,
  TabGroupingPreferences, // NEW: Export grouping preferences type
} from './collections.types';

// ===== QUERIES =====
// NOTE: subscribeToCollections/subscribeToCollection were removed — no
// realtime backend. See collections.queries.ts for the hooks that need to
// switch to fetch + refetch-on-mutation/interval instead.
export {
  getCollection,
  getCollections,
  getCollectionsByCategory,
  searchCollections,
} from './collections.queries';

// ===== MUTATIONS =====
export {
  createCollection,
  deleteCollection,
  duplicateCollection,
  updateCollectionMetadata,
  updateCollectionTaxRate,
  updateCollectionLastAccessed,
  saveCollectionChanges, // ✅ NEW: The master save function
} from './collections.mutations';

// ===== CATEGORIES =====
export {
  addCategoryToCollection,
  removeCategoryFromCollection,
  createTabsFromSelection,
} from './collections.categories';

// ===== PRODUCTS =====
export {
  getProductsForCollectionTabs,
} from './collections.products';

// ===== LABOR =====
export {
  getLaborItemsForCollectionTabs,
} from './collections.labor';

// ===== TOOLS =====
export {
  getToolsForCollectionTabs,
} from './collections.tools';

// ===== EQUIPMENT =====
export {
  getEquipmentForCollectionTabs,
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