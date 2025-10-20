// src/services/inventory/equipment/index.ts

/**
 * Equipment Services - Barrel Export
 * 
 * Modular structure for equipment management:
 * - equipment.types.ts: TypeScript interfaces and types
 * - equipment.queries.ts: READ operations
 * - equipment.mutations.ts: WRITE operations
 * - sections.ts: Equipment sections (Level 2)
 * - categories.ts: Equipment categories (Level 3)
 * - subcategories.ts: Equipment subcategories (Level 4)
 * - rentalStores.ts: Rental store management
 */

// Export all types
export type {
  EquipmentItem,
  EquipmentFilters,
  EquipmentResponse,
  PaginatedEquipmentResponse,
  EquipmentSection,
  EquipmentCategory,
  EquipmentSubcategory
} from './equipment.types';

// Export query functions
export {
  getEquipmentItem,
  getEquipment,
  getEquipmentByTrade,
  getAvailableEquipment,
  getRentedEquipment,
  getOwnedEquipment
} from './equipment.queries';

// Export mutation functions
export {
  createEquipmentItem,
  updateEquipmentItem,
  deleteEquipmentItem,
  updateEquipmentStatus
} from './equipment.mutations';

// Export equipment section functions
export {
  getEquipmentSections,
  addEquipmentSection
} from './sections';

// Export equipment category functions
export {
  getEquipmentCategories,
  addEquipmentCategory
} from './categories';

// Export equipment subcategory functions
export {
  getEquipmentSubcategories,
  addEquipmentSubcategory
} from './subcategories';

// Export rental store functions
export type { RentalStore } from './rentalStores';
export {
  getRentalStores,
  addRentalStore
} from './rentalStores';

// Re-export shared trade functions from categories service
// (Trades are shared between products, labor, tools, and equipment)
export { 
  getProductTrades,
  addProductTrade,
  type ProductTrade
} from '../../categories/trades';