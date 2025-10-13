// src/services/products/products.stats.ts
import { collection, query, getDocs, QuerySnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import type { DatabaseResult } from '../../../firebase/database';
import { InventoryProduct, ProductStats } from './products.types';
import { COLLECTION_NAME, calculateProductValue } from './products.utils';

/**
 * Get comprehensive product statistics for dashboard
 */
export const getProductStats = async (): Promise<DatabaseResult<ProductStats>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryProduct[];

    const stats: ProductStats = {
      totalProducts: products.length,
      totalValue: products.reduce((sum, product) => sum + calculateProductValue(product), 0),
      lowStockCount: products.filter(
        (p) => p.onHand <= p.minStock && p.onHand > 0
      ).length,
      outOfStockCount: products.filter((p) => p.onHand === 0).length,
      byTrade: {},
      bySection: {},
      byCategory: {},
      byType: {},
    };

    // Count by trade, section, category, and type
    products.forEach((product) => {
      stats.byTrade[product.trade] = (stats.byTrade[product.trade] || 0) + 1;
      stats.bySection[product.section] = (stats.bySection[product.section] || 0) + 1;
      stats.byCategory[product.category] = (stats.byCategory[product.category] || 0) + 1;
      stats.byType[product.type] = (stats.byType[product.type] || 0) + 1;
    });

    console.log('✅ Product stats calculated:', {
      total: stats.totalProducts,
      value: stats.totalValue.toFixed(2),
      lowStock: stats.lowStockCount,
      outOfStock: stats.outOfStockCount,
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('❌ Error getting product stats:', error);
    return { success: false, error };
  }
};

/**
 * Get total inventory value
 */
export const getInventoryValue = async (): Promise<DatabaseResult<number>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryProduct[];

    const totalValue = products.reduce(
      (sum, product) => sum + calculateProductValue(product),
      0
    );

    console.log(`✅ Total inventory value: $${totalValue.toFixed(2)}`);
    return { success: true, data: totalValue };
  } catch (error) {
    console.error('❌ Error getting inventory value:', error);
    return { success: false, error };
  }
};

/**
 * Get products grouped by trade
 */
export const getProductsByTrade = async (): Promise<
  DatabaseResult<Record<string, InventoryProduct[]>>
> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryProduct[];

    const byTrade: Record<string, InventoryProduct[]> = {};

    products.forEach((product) => {
      if (!byTrade[product.trade]) {
        byTrade[product.trade] = [];
      }
      byTrade[product.trade].push(product);
    });

    console.log(`✅ Products grouped by ${Object.keys(byTrade).length} trades`);
    return { success: true, data: byTrade };
  } catch (error) {
    console.error('❌ Error getting products by trade:', error);
    return { success: false, error };
  }
};

/**
 * Get products grouped by category
 */
export const getProductsByCategory = async (): Promise<
  DatabaseResult<Record<string, InventoryProduct[]>>
> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryProduct[];

    const byCategory: Record<string, InventoryProduct[]> = {};

    products.forEach((product) => {
      if (!byCategory[product.category]) {
        byCategory[product.category] = [];
      }
      byCategory[product.category].push(product);
    });

    console.log(
      `✅ Products grouped by ${Object.keys(byCategory).length} categories`
    );
    return { success: true, data: byCategory };
  } catch (error) {
    console.error('❌ Error getting products by category:', error);
    return { success: false, error };
  }
};

/**
 * Get low stock summary (count by severity)
 */
export const getLowStockSummary = async (): Promise<
  DatabaseResult<{
    critical: number;
    low: number;
    total: number;
  }>
> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryProduct[];

    const critical = products.filter((p) => p.onHand === 0).length;
    const low = products.filter((p) => p.onHand > 0 && p.onHand <= p.minStock).length;

    const summary = {
      critical,
      low,
      total: critical + low,
    };

    console.log('✅ Low stock summary:', summary);
    return { success: true, data: summary };
  } catch (error) {
    console.error('❌ Error getting low stock summary:', error);
    return { success: false, error };
  }
};

/**
 * Get products that need reordering (below min stock with calculated quantities)
 */
export const getReorderList = async (): Promise<
  DatabaseResult<
    Array<{
      product: InventoryProduct;
      reorderQuantity: number;
    }>
  >
> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryProduct[];

    const reorderList = products
      .filter((p) => p.onHand <= p.minStock)
      .map((product) => ({
        product,
        reorderQuantity: Math.max(
          0,
          product.maxStock - product.onHand
        ),
      }))
      .sort((a, b) => a.product.onHand - b.product.onHand); // Most critical first

    console.log(`✅ Reorder list generated: ${reorderList.length} products need reordering`);
    return { success: true, data: reorderList };
  } catch (error) {
    console.error('❌ Error getting reorder list:', error);
    return { success: false, error };
  }
};

/**
 * Get top products by value (highest inventory value)
 */
export const getTopProductsByValue = async (
  limit: number = 10
): Promise<DatabaseResult<InventoryProduct[]>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryProduct[];

    const topProducts = products
      .sort((a, b) => calculateProductValue(b) - calculateProductValue(a))
      .slice(0, limit);

    console.log(`✅ Top ${limit} products by value retrieved`);
    return { success: true, data: topProducts };
  } catch (error) {
    console.error('❌ Error getting top products by value:', error);
    return { success: false, error };
  }
};