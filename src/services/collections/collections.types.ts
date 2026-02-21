// src/services/collections/collections.types.ts
import { Timestamp } from 'firebase/firestore';

// Content types for collections
export type CollectionContentType = 'products' | 'labor' | 'tools' | 'equipment';

export interface HierarchicalCategoryItem {
  name: string;
  tradeId?: string;
  tradeName?: string;
  sectionId?: string;
  sectionName?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}

// Updated CategorySelection with hierarchical structure
export interface CategorySelection {
  trade?: string;
  sections: string[] | HierarchicalCategoryItem[];
  categories: string[] | HierarchicalCategoryItem[];
  subcategories: string[] | HierarchicalCategoryItem[];
  types?: string[] | HierarchicalCategoryItem[];
  description?: string;
}

// Helper to check if using old flat structure
export type LegacyCategorySelection = {
  trade?: string;
  sections: string[];
  categories: string[];
  subcategories: string[];
  types: string[];
  description?: string;
};

// Type guard
export const isLegacySelection = (sel: any): sel is LegacyCategorySelection => {
  return sel.sections && Array.isArray(sel.sections) && typeof sel.sections[0] === 'string';
};

// Category tab structure (UI tabs grouping items by category)
export interface CategoryTab {
  id: string;
  type: CollectionContentType;
  name: string;           // Display name (category name)
  section: string;        // Parent section for disambiguation
  category: string;       // Actual category value
  subcategories: string[]; // List of subcategories included
  itemIds: string[];      // IDs of items in this tab
}

// NEW: Tab grouping preferences (section-based collapsing)
export interface TabGroupingPreferences {
  products?: Record<string, boolean>; // sectionId -> isCollapsed
  labor?: Record<string, boolean>;
  tools?: Record<string, boolean>;
  equipment?: Record<string, boolean>;
}

// Item selection state (products, labor, tools, equipment)
export interface ItemSelection {
  isSelected: boolean;
  quantity: number;
  categoryTabId: string;
  addedAt: number;
  // Cached data for display
  itemName?: string;
  itemSku?: string;
  unitPrice?: number;
  // Labor-specific
  rateType?: 'flat' | 'hourly';
  selectedRateId?: string;
  estimatedHours?: number;
  // Tool/Equipment-specific
  isAssigned?: boolean;
  assignedTo?: string;
}

// Legacy structure (keeping for backwards compatibility)
export interface AssignedProduct {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  notes?: string;
}

// ============================================================
// 🚧 TEMPORARY - ACCOUNTING SECTION - TO BE MOVED LATER 🚧
// ============================================================

export interface CalculatorRow {
  id: string;
  name: string;
  isChecked: boolean;
  currentPrice: number;
  alternativePrice: number;
}

export interface CollectionCalculation {
  finalSalePrice: number;
  rows: CalculatorRow[];
  possibleSalePrice: number;
  gainIncrease: number;
  lastUpdated: Timestamp | string;
}

// ============================================================
// 🚧 END ACCOUNTING SECTION 🚧
// ============================================================

// Main collection interface
export interface Collection {
  id?: string;
  name: string;
  category: string; // Primary category (trade) for backwards compatibility
  description?: string;
  estimatedHours?: number;
  categorySelection: CategorySelection;

  // Legacy field (keeping for backwards compatibility)
  assignedProducts: AssignedProduct[];

  // Category tabs by type
  productCategoryTabs: CategoryTab[];
  laborCategoryTabs: CategoryTab[];
  toolCategoryTabs: CategoryTab[];
  equipmentCategoryTabs: CategoryTab[];

  // Selections by type
  productSelections: Record<string, ItemSelection>;
  laborSelections: Record<string, ItemSelection>;
  toolSelections: Record<string, ItemSelection>;
  equipmentSelections: Record<string, ItemSelection>;

  // Tax and pricing
  taxRate: number;

  // NEW: Tab grouping preferences
  tabGroupingPreferences?: TabGroupingPreferences;

  // ============================================================
  // 🚧 TEMPORARY - ACCOUNTING SECTION 🚧
  // ============================================================
  calculations?: CollectionCalculation;
  // ============================================================
  // 🚧 END ACCOUNTING SECTION 🚧
  // ============================================================

  // Metadata
  userId?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  lastAccessedAt?: Timestamp | string;
}

// Filters for querying collections
export interface CollectionFilters {
  category?: string;
  userId?: string;
  contentType?: CollectionContentType;
}

// Database operation result wrapper
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  id?: string;
  error?: any;
}

// Statistics for collections
export interface CollectionStats {
  total: number;
  byCategory: Record<string, number>;
  byContentType: Record<CollectionContentType, number>;
  averageHours: number;
}

// Paginated response
export interface PaginatedCollectionResponse {
  collections: Collection[];
  hasMore: boolean;
  lastDoc: any;
}

// Standard response wrapper
export interface CollectionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}