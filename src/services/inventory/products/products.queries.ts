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
import { fetchInventoryBatches } from '../batch';
import { getInventorySelectionIds } from '../selection';
import { listHierarchy } from '../../categories/hierarchyApi';

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

export interface ProductPage {
  items: InventoryProduct[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  metrics: {
    totalCount: number;
    totalValue: number;
    lowStockItems: number;
    categories: number;
    totalOnHand: number;
    totalAssigned: number;
  };
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
    tradeId: row.tradeId ? String(row.tradeId) : '',
    sectionId: row.sectionId ? String(row.sectionId) : '',
    categoryId: row.categoryId ? String(row.categoryId) : '',
    subcategoryId: row.subcategoryId ? String(row.subcategoryId) : '',
    typeId: row.typeId ? String(row.typeId) : '',
    sizeId: row.sizeId ? String(row.sizeId) : '',
    brandId: row.brandId ? String(row.brandId) : '',
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

/** Desktop-only opt-in keyset page. The legacy getProducts array stays available to mobile. */
export const getProductsPage = async (
  filters: ProductFilters = {}, cursor?: string
): Promise<DatabaseResult<ProductPage>> => {
  try {
    const params = new URLSearchParams({ page: '1', limit: '50', sortBy: filters.sortBy || 'name' });
    for (const key of ['tradeId', 'sectionId', 'categoryId', 'subcategoryId', 'typeId', 'sizeId', 'brandId'] as const) {
      if (filters[key]) params.set(key, filters[key]!);
    }
    if (filters.searchTerm) params.set('search', filters.searchTerm);
    if (filters.outOfStock) params.set('stock', 'out');
    else if (filters.lowStock) params.set('stock', 'low');
    else if (filters.inStock) params.set('stock', 'in');
    if (cursor) params.set('cursor', cursor);
    const [page, maps] = await Promise.all([
      inventoryApiRequest<Omit<ProductPage, 'items'> & { items: ProductRow[] }>(`/inventory/products?${params}`),
      buildNameMaps(),
    ]);
    return {
      success: true,
      data: {
        ...page,
        items: page.items.map(row => toInventoryProduct(row, maps)),
        metrics: {
          totalCount: Number(page.metrics.totalCount),
          totalValue: Number(page.metrics.totalValue),
          lowStockItems: Number(page.metrics.lowStockItems),
          categories: Number(page.metrics.categories),
          totalOnHand: Number(page.metrics.totalOnHand),
          totalAssigned: Number(page.metrics.totalAssigned),
        },
      },
    };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to fetch products') };
  }
};

/** Bounded, owner-scoped inventory reads used by desktop collections. */
export const getProductsByIds = async (
  productIds: string[]
): Promise<DatabaseResult<InventoryProduct[]>> => {
  try {
    if (productIds.length === 0) return { success: true, data: [] };
    const [rows, maps] = await Promise.all([
      fetchInventoryBatches<ProductRow>('/inventory/products', productIds),
      buildNameMaps(),
    ]);
    return { success: true, data: rows.map(row => toInventoryProduct(row, maps)) };
  } catch (error) {
    console.error('Error getting products by IDs:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch products') };
  }
};

/**
 * Get products by category selection (for Collections module)
 * Filters products through the entire hierarchy: Trade → Section → Category → Subcategory → Type
 * Supports both legacy flat structure and new hierarchical structure
 */
export const getProductsByCategories = async (
  categorySelection: CategorySelection,
  _userId?: string
): Promise<DatabaseResult<InventoryProduct[]>> => {
  try {
    const ids = await getInventorySelectionIds('products', categorySelection);
    return getProductsByIds(ids);
  } catch (error) {
    console.error('💥 Error getting products by categories:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch products') };
  }
};

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
