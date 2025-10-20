// src/services/inventory/tools/index.ts

/**
 * Tool Services - Barrel Export
 * 
 * Modular structure for tool management:
 * - tool.types.ts: TypeScript interfaces and types
 * - tool.queries.ts: READ operations
 * - tool.mutations.ts: WRITE operations
 * - sections.ts: Tool sections (Level 2)
 * - categories.ts: Tool categories (Level 3)
 * - subcategories.ts: Tool subcategories (Level 4)
 * - brands.ts: Tool brands
 */

// Export all types
export type {
  ToolItem,
  ToolFilters,
  ToolResponse,
  PaginatedToolResponse,
  ToolSection,
  ToolCategory,
  ToolSubcategory
} from './tool.types';

// Export query functions
export {
  getToolItem,
  getTools,
  getToolsByTrade,
  getAvailableTools
} from './tool.queries';

// Export mutation functions
export {
  createToolItem,
  updateToolItem,
  deleteToolItem,
  updateToolStatus
} from './tool.mutations';

// Export tool section functions
export {
  getToolSections,
  addToolSection
} from './sections';

// Export tool category functions
export {
  getToolCategories,
  addToolCategory
} from './categories';

// Export tool subcategory functions
export {
  getToolSubcategories,
  addToolSubcategory
} from './subcategories';

// Export tool brand functions
export type { ToolBrand } from './brands';
export {
  getToolBrands,
  addToolBrand
} from './brands';

// Re-export shared trade functions from categories service
// (Trades are shared between products, labor, and tools)
export { 
  getProductTrades,
  addProductTrade,
  type ProductTrade
} from '../../categories/trades';