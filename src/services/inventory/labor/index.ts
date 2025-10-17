// src/services/labor/index.ts

/**
 * Labor Services - Barrel Export
 * 
 * Modular structure for labor management:
 * - labor.types.ts: TypeScript interfaces and types
 * - labor.queries.ts: READ operations
 * - labor.mutations.ts: WRITE operations
 * - sections.ts: Labor sections (references shared productTrades)
 * - categories.ts: Labor categories (references laborSections)
 */

// Export all types
export type {
  LaborItem,
  FlatRate,
  HourlyRate,
  Task,
  LaborFilters,
  LaborResponse,
  PaginatedLaborResponse
} from './labor.types';

// Export query functions
export {
  getLaborItem,
  getLaborItems,
  getLaborItemsByTrade,
  getActiveLaborItems
} from './labor.queries';

// Export mutation functions
export {
  createLaborItem,
  updateLaborItem,
  deleteLaborItem,
  toggleLaborItemStatus
} from './labor.mutations';

// Export labor section functions
export type { LaborSection } from './sections';
export {
  getLaborSections,
  addLaborSection
} from './sections';

// Export labor category functions
export type { LaborCategory } from './categories';
export {
  getLaborCategories,
  addLaborCategory
} from './categories';

// Re-export shared trade functions from categories service
// (Trades are shared between products and labor)
export { 
  getProductTrades,
  addProductTrade,
  type ProductTrade
} from '../../categories/trades';