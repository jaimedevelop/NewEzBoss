// src/services/products/products.queries.ts
import { CategorySelection } from '../../collections';
import {
  InventoryProduct,
  ProductFilters,
  StockAlert,
} from './products.types';
import {
  isLowStock,
  isOutOfStock,
  isInStock,
  getPrimarySKU,
  getStockSeverity,
} from './products.utils';
import { inventoryApiRequest, ApiError } from '../inventoryApi';
import { listHierarchy } from '../../categories/hierarchyApi';

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

interface ProductChildRow {
  id: number;
  store: string;
  [key: string]: unknown;
}

interface ProductRow {
  id: number;
  tradeId: number | null;
  sectionId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  typeId: number | null;
  sizeId: number | null;
  brandId: number | null;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string | null;
  unitPrice: string | number;
  onHand: number;
  assigned: number;
  available: number;
  minStock: number;
  maxStock: number;
  supplier: string | null;
  location: string | null;
  barcode: string | null;
  imageUrl: string | null;
  priceEntries: ProductChildRow[];
  skus: ProductChildRow[];
  userId: number;
  createdAt: string;
  updatedAt: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

async function buildNameMaps() {
  const [trades, sections, categories, subcategories, types, sizes, brands] = await Promise.all([
    listHierarchy('trade', undefined),
    listHierarchy('section', 'product'),
    listHierarchy('category', 'product'),
    listHierarchy('subcategory', 'product'),
    listHierarchy('type', 'product'),
    listHierarchy('size', 'product'),
    inventoryApiRequest<{ id: number; name: string }[]>('/inventory/categories/lookups/brands?itemType=product'),
  ]);

  const nameById = (rows: { id: number; name: string }[]) =>
    new Map(rows.map(r => [r.id, r.name]));
  const idByName = (rows: { id: number; name: string }[]) =>
    new Map(rows.map(r => [r.name, r.id]));

  return {
    tradeNames: nameById(trades),
    sectionNames: nameById(sections),
    categoryNames: nameById(categories),
    subcategoryNames: nameById(subcategories),
    typeNames: nameById(types),
    sizeNames: nameById(sizes),
    brandNames: nameById(brands),
    tradeIds: idByName(trades),
    sectionIds: idByName(sections),
    categoryIds: idByName(categories),
    subcategoryIds: idByName(subcategories),
    typeIds: idByName(types),
    sizeIds: idByName(sizes),
  };
}

function toInventoryProduct(
  row: ProductRow,
  maps: Awaited<ReturnType<typeof buildNameMaps>>
): InventoryProduct {
  return {
    id: String(row.id),
    name: row.name,
    sku: row.sku ?? '',
    brand: row.brandId ? maps.brandNames.get(row.brandId) ?? '' : '',
    trade: row.tradeId ? maps.tradeNames.get(row.tradeId) ?? '' : '',
    section: row.sectionId ? maps.sectionNames.get(row.sectionId) ?? '' : '',
    category: row.categoryId ? maps.categoryNames.get(row.categoryId) ?? '' : '',
    subcategory: row.subcategoryId ? maps.subcategoryNames.get(row.subcategoryId) ?? '' : '',
    type: row.typeId ? maps.typeNames.get(row.typeId) ?? '' : '',
    size: row.sizeId ? maps.sizeNames.get(row.sizeId) ?? '' : '',
    description: row.description ?? '',
    unit: row.unit ?? '',
    unitPrice: Number(row.unitPrice) || 0,
    onHand: Number(row.onHand) || 0,
    assigned: Number(row.assigned) || 0,
    available: Number(row.available) || 0,
    minStock: Number(row.minStock) || 0,
    maxStock: Number(row.maxStock) || 0,
    supplier: row.supplier ?? '',
    location: row.location ?? '',
    lastUpdated: row.updatedAt ? row.updatedAt.split('T')[0] : '',
    priceEntries: (row.priceEntries ?? []).map(p => ({
      id: String(p.id),
      store: p.store,
      price: Number(p.price) || 0,
      lastUpdated: (p.lastUpdated as string | null) ?? undefined,
    })),
    skus: (row.skus ?? []).map(s => ({
      id: String(s.id),
      store: s.store,
      sku: (s.sku as string | null) ?? '',
    })),
    barcode: row.barcode ?? '',
    imageUrl: row.imageUrl ?? '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get a single product by ID
 */
export const getProduct = async (
  productId: string
): Promise<DatabaseResult<InventoryProduct>> => {
  try {
    const [row, maps] = await Promise.all([
      inventoryApiRequest<ProductRow>(`/inventory/products/${productId}`),
      buildNameMaps(),
    ]);
    return { success: true, data: toInventoryProduct(row, maps) };
  } catch (error) {
    console.error('Error getting product:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch product') };
  }
};

/**
 * Get products with filtering and sorting (no pagination)
 */
export const getProducts = async (
  filters: ProductFilters = {}
): Promise<DatabaseResult<InventoryProduct[]>> => {
  try {
    const maps = await buildNameMaps();

    const params = new URLSearchParams();
    const tradeId = filters.tradeId ?? (filters.trade ? maps.tradeIds.get(filters.trade) : undefined);
    const sectionId = filters.sectionId ?? (filters.section ? maps.sectionIds.get(filters.section) : undefined);
    const categoryId = filters.categoryId ?? (filters.category ? maps.categoryIds.get(filters.category) : undefined);
    const subcategoryId =
      filters.subcategoryId ?? (filters.subcategory ? maps.subcategoryIds.get(filters.subcategory) : undefined);
    const typeId = filters.typeId ?? (filters.type ? maps.typeIds.get(filters.type) : undefined);
    const sizeId = filters.sizeId ?? (filters.size ? maps.sizeIds.get(filters.size) : undefined);

    if (tradeId) params.set('tradeId', String(tradeId));
    if (sectionId) params.set('sectionId', String(sectionId));
    if (categoryId) params.set('categoryId', String(categoryId));
    if (subcategoryId) params.set('subcategoryId', String(subcategoryId));
    if (typeId) params.set('typeId', String(typeId));
    if (sizeId) params.set('sizeId', String(sizeId));
    if (filters.brandId) params.set('brandId', filters.brandId);

    const qs = params.toString();
    const rows = await inventoryApiRequest<ProductRow[]>(`/inventory/products${qs ? `?${qs}` : ''}`);

    let products = rows.map(row => toInventoryProduct(row, maps));

    if (filters.supplier) products = products.filter(p => p.supplier === filters.supplier);
    if (filters.location) products = products.filter(p => p.location === filters.location);

    const sortField = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';
    products.sort((a, b) => {
      const av = a[sortField as keyof InventoryProduct];
      const bv = b[sortField as keyof InventoryProduct];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    if (filters.limit) products = products.slice(0, filters.limit);

    if (filters.lowStock) products = products.filter(isLowStock);
    if (filters.outOfStock) products = products.filter(isOutOfStock);
    if (filters.inStock) products = products.filter(isInStock);
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.supplier.toLowerCase().includes(term) ||
        p.trade.toLowerCase().includes(term) ||
        p.section.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.subcategory.toLowerCase().includes(term)
      );
    }

    return { success: true, data: products };
  } catch (error) {
    console.error('Error getting products:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch products') };
  }
};

/**
 * Get products by category selection (for Collections module)
 * Filters products through the entire hierarchy: Trade → Section → Category → Subcategory → Type
 * Supports both legacy flat structure and new hierarchical structure
 */
export const getProductsByCategories = async (
  categorySelection: CategorySelection
): Promise<DatabaseResult<InventoryProduct[]>> => {
  try {
    const maps = await buildNameMaps();
    const rows = await inventoryApiRequest<ProductRow[]>('/inventory/products');
    const allProducts = rows.map(row => toInventoryProduct(row, maps));

    // Legacy detection: sections array contains plain strings
    const isLegacy =
      categorySelection.sections.length > 0 &&
      typeof categorySelection.sections[0] === 'string';

    const filteredProducts = allProducts.filter(product =>
      isLegacy
        ? matchLegacyFlat(product, categorySelection as any)
        : matchHierarchical(product, categorySelection)
    );

    return { success: true, data: filteredProducts };
  } catch (error) {
    console.error('💥 Error getting products by categories:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch products') };
  }
};

/**
 * Match product against legacy flat category selection
 */
function matchLegacyFlat(
  product: InventoryProduct,
  selection: {
    trade?: string;
    sections: string[];
    categories: string[];
    subcategories: string[];
    types: string[]
  }
): boolean {
  if (selection.trade && product.trade !== selection.trade) return false;
  if (selection.sections.length > 0 && !selection.sections.includes(product.section)) return false;
  if (selection.categories.length > 0 && !selection.categories.includes(product.category)) return false;

  if (selection.subcategories.length > 0) {
    const hasMatchingSubcategory = selection.subcategories.includes(product.subcategory);
    const hasNoSubcategory = !product.subcategory || product.subcategory === '' || product.subcategory === '(none)';
    if (!hasMatchingSubcategory) {
      if (hasNoSubcategory) {
        if (!selection.categories.includes(product.category)) return false;
      } else {
        return false;
      }
    }
  }

  if (selection.types.length > 0) {
    const hasMatchingType = selection.types.includes(product.type);
    const hasNoType = !product.type || product.type === '' || product.type === '(none)';
    if (!hasMatchingType) {
      if (hasNoType) {
        if (!selection.subcategories.includes(product.subcategory)) return false;
      } else {
        return false;
      }
    }
  }

  return true;
}

/**
 * ID-first match with name fallback. Skips the check entirely when the
 * selection has no constraint at that level (both id and name are absent).
 */
function matchField(
  productValue: string,
  productId: string | undefined,
  selectionId: string | undefined,
  selectionName: string | undefined
): boolean {
  if (!selectionId && !selectionName) return true; // no constraint — skip
  if (productId && selectionId) return productId === selectionId;
  return productValue === selectionName;
}

/**
 * Match product against hierarchical category selection.
 * A product matches if it satisfies ANY of the selected sections/categories/subcategories/types.
 * Each level uses ID-first matching with name fallback, and skips ancestor checks
 * when the ancestor info is absent (e.g. section selected without a resolved tradeName).
 */
function matchHierarchical(
  product: InventoryProduct,
  selection: CategorySelection
): boolean {
  const sections = selection.sections as any[];
  const categories = selection.categories as any[];
  const subcategories = selection.subcategories as any[];
  const types = (selection.types || []) as any[];

  const hasAnySelection =
    sections.length > 0 ||
    categories.length > 0 ||
    subcategories.length > 0 ||
    types.length > 0;

  // Trade-only selection
  if (!hasAnySelection) {
    if (selection.tradeId) return (product as any).tradeId === selection.tradeId;
    if (selection.trade) return product.trade === selection.trade;
    return true;
  }

  // Section-level: product.section matches s.name, ancestor checks skipped when absent
  if (sections.length > 0) {
    const match = sections.some((s: any) =>
      matchField(product.section, undefined, undefined, s.name) &&
      matchField(product.trade, undefined, s.tradeId, s.tradeName)
    );
    if (match) return true;
  }

  // Category-level
  if (categories.length > 0) {
    const match = categories.some((c: any) =>
      matchField(product.category, undefined, undefined, c.name) &&
      matchField(product.section, undefined, c.sectionId, c.sectionName) &&
      matchField(product.trade, undefined, c.tradeId, c.tradeName)
    );
    if (match) return true;
  }

  // Subcategory-level
  if (subcategories.length > 0) {
    const match = subcategories.some((sc: any) =>
      matchField(product.subcategory, undefined, undefined, sc.name) &&
      matchField(product.category, undefined, sc.categoryId, sc.categoryName) &&
      matchField(product.section, undefined, sc.sectionId, sc.sectionName) &&
      matchField(product.trade, undefined, sc.tradeId, sc.tradeName)
    );
    if (match) return true;
  }

  // Type-level
  if (types.length > 0) {
    const match = types.some((t: any) =>
      matchField(product.type, undefined, undefined, t.name) &&
      matchField(product.subcategory, undefined, t.subcategoryId, t.subcategoryName) &&
      matchField(product.category, undefined, t.categoryId, t.categoryName) &&
      matchField(product.section, undefined, t.sectionId, t.sectionName) &&
      matchField(product.trade, undefined, t.tradeId, t.tradeName)
    );
    if (match) return true;
  }

  return false;
}

/**
 * Get products with low stock alerts
 */
export const getLowStockProducts = async (): Promise<
  DatabaseResult<StockAlert[]>
> => {
  try {
    const maps = await buildNameMaps();
    const rows = await inventoryApiRequest<ProductRow[]>('/inventory/products');
    const alerts: StockAlert[] = rows
      .map(row => toInventoryProduct(row, maps))
      .filter(isLowStock)
      .sort((a, b) => a.onHand - b.onHand)
      .map((product) => ({
        productId: product.id!,
        productName: product.name,
        sku: getPrimarySKU(product),
        currentStock: product.onHand,
        minStock: product.minStock,
        severity: getStockSeverity(product) as 'low' | 'critical',
      }));

    return { success: true, data: alerts };
  } catch (error) {
    console.error('Error getting low stock products:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch low stock products') };
  }
};
