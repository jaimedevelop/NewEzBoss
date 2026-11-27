// src/services/products/products.mutations.ts
import { InventoryProduct, BulkProductUpdate } from './products.types';
import { validateProductData } from './products.utils';
import { inventoryApiRequest, ApiError, deleteInventoryRecord } from '../inventoryApi';
import { listHierarchy } from '../../categories/hierarchyApi';
import { invalidateCache as invalidateProductCache } from '../../../utils/productCache';

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

interface ProductRow {
  id: number;
}

interface BrandRow {
  id: number;
  name: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

const hierarchyFields = [
  { level: 'trade', id: 'tradeId', parent: null },
  { level: 'section', id: 'sectionId', parent: 'tradeId' },
  { level: 'category', id: 'categoryId', parent: 'sectionId' },
  { level: 'subcategory', id: 'subcategoryId', parent: 'categoryId' },
  { level: 'type', id: 'typeId', parent: 'subcategoryId' },
  { level: 'size', id: 'sizeId', parent: 'tradeId' },
] as const;

type HierarchyIds = Partial<Record<(typeof hierarchyFields)[number]['id'], number>>;

async function resolveHierarchyIds(product: Partial<InventoryProduct>, productId?: string) {
  const selected = hierarchyFields.filter(({ level }) => product[level]?.trim());
  const omitted = new Set(hierarchyFields
    .filter(({ level }) => product[level] === undefined)
    .map(({ id }) => id));
  const needsCurrentParents = selected.some(({ parent }) => parent && omitted.has(parent));
  const [rowsByLevel, currentParents, brands] = await Promise.all([
    Promise.all(selected.map(({ level }) =>
      listHierarchy(level, level === 'trade' ? undefined : 'product')
    )),
    productId && needsCurrentParents
      ? inventoryApiRequest<HierarchyIds>(`/inventory/products/${productId}`)
      : undefined,
    product.brand?.trim()
      ? inventoryApiRequest<BrandRow[]>('/inventory/categories/lookups/brands?itemType=product')
      : [],
  ]);

  const matchesName = (row: { name: string }, name: string | undefined) =>
    row.name.toLowerCase() === name?.trim().toLowerCase();

  const ids: HierarchyIds = {};
  selected.forEach(({ level, id, parent }, index) => {
    const parentIds = parent && omitted.has(parent) ? currentParents : ids;
    const parentId = parent ? parentIds?.[parent] : undefined;
    const match = rowsByLevel[index].find(row =>
      matchesName(row, product[level]) &&
      (!parent || (parentId != null && String(row[parent]) === String(parentId)))
    );
    if (!match) {
      throw new Error(`The selected ${level} is no longer available in this product hierarchy. Review your selections and try again.`);
    }
    ids[id] = match.id;
  });

  return { ...ids, brandId: brands.find(row => matchesName(row, product.brand))?.id };
}

function toApiBody(
  productData: Partial<InventoryProduct>,
  ids: Awaited<ReturnType<typeof resolveHierarchyIds>>
) {
  return {
    tradeId: ids.tradeId ?? undefined,
    sectionId: ids.sectionId ?? undefined,
    categoryId: ids.categoryId ?? undefined,
    subcategoryId: ids.subcategoryId ?? undefined,
    typeId: ids.typeId ?? undefined,
    sizeId: ids.sizeId ?? undefined,
    brandId: ids.brandId ?? undefined,
    name: productData.name,
    sku: productData.sku,
    description: productData.description,
    unit: productData.unit,
    unitPrice: productData.unitPrice,
    onHand: productData.onHand,
    assigned: productData.assigned,
    minStock: productData.minStock,
    maxStock: productData.maxStock,
    supplier: productData.supplier,
    location: productData.location,
    barcode: productData.barcode,
    imageUrl: productData.imageUrl,
    priceEntries: productData.priceEntries?.map(p => ({
      store: p.store,
      price: p.price,
      lastUpdated: p.lastUpdated,
    })),
    skus: productData.skus?.map(s => ({ store: s.store, sku: s.sku })),
  };
}

/**
 * Create a new product
 */
export const createProduct = async (
  productData: Omit<InventoryProduct, 'id' | 'createdAt' | 'updatedAt' | 'available'>
): Promise<DatabaseResult> => {
  try {
    const validation = validateProductData(productData);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    const ids = await resolveHierarchyIds(productData);
    const row = await inventoryApiRequest<ProductRow>('/inventory/products', {
      method: 'POST',
      body: JSON.stringify({ ...toApiBody(productData, ids), storeSource: productData.storeSource }),
    });

    invalidateProductCache();
    console.log('✅ Product created successfully:', row.id);
    return { success: true, id: String(row.id) };
  } catch (error) {
    console.error('❌ Error creating product:', error);
    return { success: false, error: errorMessage(error, 'Failed to create product') };
  }
};

/**
 * Update a product
 */
export const updateProduct = async (
  productId: string,
  productData: Partial<InventoryProduct>
): Promise<DatabaseResult> => {
  try {
    const validation = validateProductData(productData);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    const ids = await resolveHierarchyIds(productData, productId);
    await inventoryApiRequest<ProductRow>(`/inventory/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(toApiBody(productData, ids)),
    });
    invalidateProductCache();

    console.log('✅ Product updated successfully:', productId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating product:', error);
    return { success: false, error: errorMessage(error, 'Failed to update product') };
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (productId: string): Promise<DatabaseResult> => {
  try {
    await deleteInventoryRecord(`/inventory/products/${productId}`);
    invalidateProductCache();
    console.log('✅ Product deleted successfully:', productId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete product') };
  }
};

/**
 * Bulk update products
 * Useful for batch operations like updating multiple prices or categories
 */
export const bulkUpdateProducts = async (
  updates: BulkProductUpdate[]
): Promise<DatabaseResult> => {
  try {
    for (const update of updates) {
      const validation = validateProductData(update.data);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed for product ${update.id}: ${validation.errors.join(', ')}`,
        };
      }
    }

    for (const update of updates) {
      const result = await updateProduct(update.id, update.data);
      if (!result.success) return result;
    }

    console.log(`✅ Bulk updated ${updates.length} products successfully`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error bulk updating products:', error);
    return { success: false, error: errorMessage(error, 'Failed to bulk update products') };
  }
};

/**
 * Duplicate a product (useful for creating variants)
 */
export const duplicateProduct = async (
  productId: string,
  modifications?: Partial<InventoryProduct>
): Promise<DatabaseResult> => {
  try {
    const { getProduct } = await import('./products.queries');
    const productResult = await getProduct(productId);

    if (!productResult.success || !productResult.data) {
      return { success: false, error: 'Product not found' };
    }

    const originalProduct = productResult.data;

    const duplicateData: any = {
      ...originalProduct,
      ...modifications,
      name: modifications?.name || `${originalProduct.name} (Copy)`,
      sku: modifications?.sku || `${originalProduct.sku}-COPY`,
      onHand: modifications?.onHand ?? 0,
      assigned: modifications?.assigned ?? 0,
      available: 0,
    };

    delete duplicateData.storeSource;
    delete duplicateData.id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    return await createProduct(duplicateData);
  } catch (error) {
    console.error('❌ Error duplicating product:', error);
    return { success: false, error: errorMessage(error, 'Failed to duplicate product') };
  }
};
