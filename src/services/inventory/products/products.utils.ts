// src/services/products/products.utils.ts
import { InventoryProduct } from './products.types';

/**
 * Firestore collection name for products
 */
export const COLLECTION_NAME = 'products';

/**
 * Calculate available quantity (onHand - assigned)
 */
export const calculateAvailable = (onHand: number, assigned: number): number => {
  return Math.max(0, onHand - assigned);
};

/**
 * Validate product data before saving
 */
export const validateProductData = (data: Partial<InventoryProduct>): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Required fields
  if (data.name !== undefined && !data.name.trim()) {
    errors.push('Product name is required');
  }

  if (data.trade !== undefined && !data.trade.trim()) {
    errors.push('Trade is required');
  }

  if (data.section !== undefined && !data.section.trim()) {
    errors.push('Section is required');
  }

  if (data.category !== undefined && !data.category.trim()) {
    errors.push('Category is required');
  }

  // Numeric validations
  if (data.unitPrice !== undefined && data.unitPrice < 0) {
    errors.push('Unit price cannot be negative');
  }

  if (data.onHand !== undefined && data.onHand < 0) {
    errors.push('On hand quantity cannot be negative');
  }

  if (data.assigned !== undefined && data.assigned < 0) {
    errors.push('Assigned quantity cannot be negative');
  }

  if (data.minStock !== undefined && data.minStock < 0) {
    errors.push('Minimum stock cannot be negative');
  }

  if (data.maxStock !== undefined && data.maxStock < 0) {
    errors.push('Maximum stock cannot be negative');
  }

  // Logical validations
  if (
    data.minStock !== undefined &&
    data.maxStock !== undefined &&
    data.minStock > data.maxStock
  ) {
    errors.push('Minimum stock cannot exceed maximum stock');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Normalize search term for consistent searching
 */
export const normalizeSearchTerm = (term: string): string => {
  return term.toLowerCase().trim();
};

/**
 * Check if product matches search term
 */
export const matchesSearchTerm = (
  product: InventoryProduct,
  searchTerm: string
): boolean => {
  const normalizedTerm = normalizeSearchTerm(searchTerm);

  return (
    product.name.toLowerCase().includes(normalizedTerm) ||
    (product.skus?.some((sku) => sku.sku.toLowerCase().includes(normalizedTerm))) ||
    product.description.toLowerCase().includes(normalizedTerm) ||
    product.supplier.toLowerCase().includes(normalizedTerm) ||
    product.trade.toLowerCase().includes(normalizedTerm) ||
    product.section.toLowerCase().includes(normalizedTerm) ||
    product.category.toLowerCase().includes(normalizedTerm) ||
    product.subcategory.toLowerCase().includes(normalizedTerm)
  );
};

/**
 * Format product for display (add any computed fields)
 */
export const formatProductForDisplay = (
  product: InventoryProduct
): InventoryProduct => {
  return {
    ...product,
    available: calculateAvailable(product.onHand, product.assigned),
  };
};

/**
 * Get primary SKU from product (first SKU or legacy sku field)
 */
export const getPrimarySKU = (product: InventoryProduct): string => {
  return product.skus?.[0]?.sku || product.sku || 'N/A';
};

/**
 * Check if product is low stock
 */
export const isLowStock = (product: InventoryProduct): boolean => {
  return product.onHand <= product.minStock && product.onHand > 0;
};

/**
 * Check if product is out of stock
 */
export const isOutOfStock = (product: InventoryProduct): boolean => {
  return product.onHand === 0;
};

/**
 * Check if product is in stock (above minimum)
 */
export const isInStock = (product: InventoryProduct): boolean => {
  return product.onHand > product.minStock;
};

/**
 * Get stock severity level
 */
export const getStockSeverity = (
  product: InventoryProduct
): 'critical' | 'low' | 'normal' => {
  if (isOutOfStock(product)) return 'critical';
  if (isLowStock(product)) return 'low';
  return 'normal';
};

/**
 * Calculate product value (quantity × price)
 */
export const calculateProductValue = (product: InventoryProduct): number => {
  return product.onHand * (product.unitPrice || 0);
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};