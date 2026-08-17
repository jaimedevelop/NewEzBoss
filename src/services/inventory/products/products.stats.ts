// src/services/products/products.stats.ts
import { InventoryProduct, ProductStats } from './products.types';
import { calculateProductValue } from './products.utils';
import { getProducts } from './products.queries';
import type { DatabaseResult } from './products.queries';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Get comprehensive product statistics for dashboard
 */
export const getProductStats = async (): Promise<DatabaseResult<ProductStats>> => {
  try {
    const result = await getProducts();
    if (!result.success || !result.data) return { success: false, error: result.error };
    const products = result.data;

    const stats: ProductStats = {
      totalProducts: products.length,
      totalValue: products.reduce((sum, product) => sum + calculateProductValue(product), 0),
      lowStockCount: products.filter((p) => p.onHand <= p.minStock && p.onHand > 0).length,
      outOfStockCount: products.filter((p) => p.onHand === 0).length,
      byTrade: {},
      bySection: {},
      byCategory: {},
      byType: {},
    };

    products.forEach((product) => {
      stats.byTrade[product.trade] = (stats.byTrade[product.trade] || 0) + 1;
      stats.bySection[product.section] = (stats.bySection[product.section] || 0) + 1;
      stats.byCategory[product.category] = (stats.byCategory[product.category] || 0) + 1;
      stats.byType[product.type] = (stats.byType[product.type] || 0) + 1;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting product stats:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch product stats') };
  }
};

/**
 * Get total inventory value
 */
export const getInventoryValue = async (): Promise<DatabaseResult<number>> => {
  try {
    const result = await getProducts();
    if (!result.success || !result.data) return { success: false, error: result.error };
    const totalValue = result.data.reduce((sum, product) => sum + calculateProductValue(product), 0);
    return { success: true, data: totalValue };
  } catch (error) {
    console.error('Error getting inventory value:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch inventory value') };
  }
};

/**
 * Get products grouped by trade
 */
export const getProductsByTrade = async (): Promise<
  DatabaseResult<Record<string, InventoryProduct[]>>
> => {
  try {
    const result = await getProducts();
    if (!result.success || !result.data) return { success: false, error: result.error };

    const byTrade: Record<string, InventoryProduct[]> = {};
    result.data.forEach((product) => {
      if (!byTrade[product.trade]) byTrade[product.trade] = [];
      byTrade[product.trade].push(product);
    });

    return { success: true, data: byTrade };
  } catch (error) {
    console.error('Error getting products by trade:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch products by trade') };
  }
};

/**
 * Get products grouped by category
 */
export const getProductsByCategory = async (): Promise<
  DatabaseResult<Record<string, InventoryProduct[]>>
> => {
  try {
    const result = await getProducts();
    if (!result.success || !result.data) return { success: false, error: result.error };

    const byCategory: Record<string, InventoryProduct[]> = {};
    result.data.forEach((product) => {
      if (!byCategory[product.category]) byCategory[product.category] = [];
      byCategory[product.category].push(product);
    });

    return { success: true, data: byCategory };
  } catch (error) {
    console.error('Error getting products by category:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch products by category') };
  }
};

/**
 * Get low stock summary (count by severity)
 */
export const getLowStockSummary = async (): Promise<
  DatabaseResult<{ critical: number; low: number; total: number }>
> => {
  try {
    const result = await getProducts();
    if (!result.success || !result.data) return { success: false, error: result.error };

    const critical = result.data.filter((p) => p.onHand === 0).length;
    const low = result.data.filter((p) => p.onHand > 0 && p.onHand <= p.minStock).length;

    return { success: true, data: { critical, low, total: critical + low } };
  } catch (error) {
    console.error('Error getting low stock summary:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch low stock summary') };
  }
};

/**
 * Get products that need reordering (below min stock with calculated quantities)
 */
export const getReorderList = async (): Promise<
  DatabaseResult<Array<{ product: InventoryProduct; reorderQuantity: number }>>
> => {
  try {
    const result = await getProducts();
    if (!result.success || !result.data) return { success: false, error: result.error };

    const reorderList = result.data
      .filter((p) => p.onHand <= p.minStock)
      .map((product) => ({
        product,
        reorderQuantity: Math.max(0, product.maxStock - product.onHand),
      }))
      .sort((a, b) => a.product.onHand - b.product.onHand);

    return { success: true, data: reorderList };
  } catch (error) {
    console.error('Error getting reorder list:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch reorder list') };
  }
};

/**
 * Get top products by value (highest inventory value)
 */
export const getTopProductsByValue = async (
  limit: number = 10
): Promise<DatabaseResult<InventoryProduct[]>> => {
  try {
    const result = await getProducts();
    if (!result.success || !result.data) return { success: false, error: result.error };

    const topProducts = result.data
      .sort((a, b) => calculateProductValue(b) - calculateProductValue(a))
      .slice(0, limit);

    return { success: true, data: topProducts };
  } catch (error) {
    console.error('Error getting top products by value:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch top products by value') };
  }
};
