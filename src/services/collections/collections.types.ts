// src/services/collections/collections.types.ts
import { Timestamp } from 'firebase/firestore';

// Content types for collections
export type CollectionContentType = 'products' | 'labor' | 'tools' | 'equipment';

// Category selection structure (used during collection creation)
export interface CategorySelection {
  trade?: string;
  sections: string[];
  categories: string[];
  subcategories: string[];
  types: string[];
  description?: string;
}

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

// Main collection interface
export interface Collection {
  id?: string;
  name: string;
  category: string; // Primary category (trade) for backwards compatibility
  description?: string;
  estimatedHours: number;
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
  
  // Metadata
  userId?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
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