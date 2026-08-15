// src/services/categories/trades.ts
// Trade-level category operations — backed by the shared Postgres hierarchy API.
// userId params are accepted for call-site compatibility but unused: the API scopes
// rows to the caller's user via the Auth0 access token (see services/apiAuth.ts).

import { DatabaseResult, ProductTrade } from './types';
import {
  createHierarchyNode,
  deleteHierarchyNode,
  errorMessage,
  getHierarchyUsage,
  listHierarchy,
  renameHierarchyNode,
  stringifyRow,
  totalItemCount,
} from './hierarchyApi';

export type { ProductTrade } from './types';

/**
 * Add a new product trade
 */
export const addProductTrade = async (
  name: string,
  _userId: string
): Promise<DatabaseResult> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Trade name cannot be empty' };
    }
    if (name.length > 30) {
      return { success: false, error: 'Trade name must be 30 characters or less' };
    }

    const row = await createHierarchyNode('trade', name.trim());
    return { success: true, id: String(row.id) };
  } catch (error) {
    console.error('Error adding product trade:', error);
    return { success: false, error: errorMessage(error, 'Failed to add trade') };
  }
};

/**
 * Get all product trades for a user
 */
export const getProductTrades = async (
  _userId: string
): Promise<DatabaseResult<ProductTrade[]>> => {
  try {
    const rows = await listHierarchy('trade');
    const trades = rows.map(stringifyRow) as unknown as ProductTrade[];
    return { success: true, data: trades };
  } catch (error) {
    console.error('Error getting product trades:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch trades') };
  }
};

/**
 * Get all available trade names (for dropdowns/filters)
 */
export const getAllAvailableTrades = async (
  userId: string
): Promise<DatabaseResult<string[]>> => {
  try {
    const tradesResult = await getProductTrades(userId);
    const trades = tradesResult.success ? tradesResult.data || [] : [];
    const tradeNames = trades.map(trade => trade.name).sort();

    return { success: true, data: tradeNames };
  } catch (error) {
    console.error('Error getting all available trades:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch trades') };
  }
};

/**
 * Update a product trade name
 */
export const updateProductTradeName = async (
  tradeId: string,
  newName: string,
  _userId: string
): Promise<DatabaseResult> => {
  try {
    if (!newName.trim()) {
      return { success: false, error: 'Trade name cannot be empty' };
    }
    if (newName.length > 30) {
      return { success: false, error: 'Trade name must be 30 characters or less' };
    }

    await renameHierarchyNode('trade', tradeId, newName.trim());
    return { success: true };
  } catch (error) {
    console.error('Error updating product trade:', error);
    return { success: false, error: errorMessage(error, 'Failed to update trade') };
  }
};

/**
 * Get usage statistics for a trade
 * Returns counts of descendant sections/categories/subcategories/types/sizes and
 * items (across all four inventory modules) that depend on this trade.
 */
export const getTradeUsageStats = async (
  tradeId: string,
  _userId: string
): Promise<DatabaseResult<{ sectionCount: number; itemCount: number }>> => {
  try {
    const usage = await getHierarchyUsage('trade', tradeId);
    return {
      success: true,
      data: {
        sectionCount: usage.descendantCounts.section ?? 0,
        itemCount: totalItemCount(usage),
      },
    };
  } catch (error) {
    console.error('Error getting trade usage stats:', error);
    return { success: false, error: errorMessage(error, 'Failed to get trade usage') };
  }
};

/**
 * Delete a product trade and all its children (sections/categories/subcategories/
 * types/sizes cascade via FK ON DELETE CASCADE in Postgres).
 * Blocked if any inventory items still reference this trade, matching prior behavior.
 */
export const deleteProductTradeWithChildren = async (
  tradeId: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    const statsResult = await getTradeUsageStats(tradeId, userId);
    if (!statsResult.success) {
      return { success: false, error: 'Failed to check trade usage' };
    }

    const { itemCount } = statsResult.data!;
    if (itemCount > 0) {
      return {
        success: false,
        error: `Cannot delete trade: ${itemCount} items are using this trade. Please reassign or delete those items first.`,
      };
    }

    await deleteHierarchyNode('trade', tradeId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting product trade:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete trade') };
  }
};
