// src/services/categories/types.ts
// Shared types and interfaces for category services

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

// Hierarchy level interfaces
export interface ProductTrade {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

export interface ProductSection {
  id?: string;
  name: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

export interface ProductCategory {
  id?: string;
  name: string;
  sectionId: string;
  userId: string;
  createdAt?: any;
}

export interface ProductSubcategory {
  id?: string;
  name: string;
  categoryId: string;
  userId: string;
  createdAt?: any;
}

export interface ProductType {
  id?: string;
  name: string;
  subcategoryId: string;
  userId: string;
  createdAt?: any;
}

export interface ProductSize {
  id?: string;
  name: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

// Standalone product type (not part of hierarchy)
export interface StandaloneProductType {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

// Category tree node for hierarchy operations
export interface CategoryNode {
  id: string;
  name: string;
  level: 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size';
  parentId?: string;
  children: CategoryNode[];
  productCount: number;
  descendantCount: number;
}

// Usage statistics for delete operations
export interface CategoryUsageStats {
  categoryCount: number;
  productCount: number;
  affectedCategories: string[];
}

// Collection name constants
export const COLLECTIONS = {
  PRODUCT_TRADES: 'productTrades',
  PRODUCT_SECTIONS: 'productSections',
  PRODUCT_CATEGORIES: 'productCategories',
  PRODUCT_SUBCATEGORIES: 'productSubcategories',
  PRODUCT_TYPES: 'productTypes',
  PRODUCT_SIZES: 'productSizes',
  STANDALONE_PRODUCT_TYPES: 'standaloneProductTypes'
} as const;