// src/services/collections/collections.queries.ts
import { collectionsApiRequest, errorMessage, ApiError } from './collectionsApi';
import { apiRowToCollection, apiDetailRowToCollection, type ApiCollectionRow } from './collections.mapper';
import type { Collection, CollectionFilters, DatabaseResult, PaginatedCollectionResponse } from './collections.types';

// NOTE: subscribeToCollections/subscribeToCollection were dropped — there is
// no realtime backend anymore. Consumers were:
//   - src/hooks/collections/collectionView/useCollectionData.ts (formerly useCollectionSubscription.ts)
//   - src/pages/collections/components/CollectionsList.tsx
// Both need to switch to a plain fetch (getCollection/getCollections) plus a
// refetch-on-mutation or polling strategy. Not rewritten here per scope.

/**
 * Get a single collection by ID (includes nested categoryTabs/itemSelections/calculation)
 */
export const getCollection = async (
  collectionId: string
): Promise<DatabaseResult<Collection>> => {
  try {
    const row = await collectionsApiRequest<ApiCollectionRow>(`/collections/${collectionId}`);
    return { success: true, data: apiDetailRowToCollection(row) };
  } catch (error) {
    console.error('Error getting collection:', error);
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error };
  }
};

/**
 * Get all collections with optional filtering (list view — flat rows, no nested tabs)
 */
export const getCollections = async (
  filters: CollectionFilters = {}
): Promise<DatabaseResult<Collection[]>> => {
  try {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.userId) params.set('userId', filters.userId);

    const query = params.toString();
    const rows = await collectionsApiRequest<ApiCollectionRow[]>(
      `/collections${query ? `?${query}` : ''}`
    );

    return { success: true, data: rows.map(apiRowToCollection) };
  } catch (error) {
    console.error('Error getting collections:', error);
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error };
  }
};

/**
 * Desktop-only opt-in page contract. Do not replace getCollections(): mobile and
 * legacy callers still depend on the historical array response.
 */
export const getCollectionsPage = async (
  options: { page: number; limit: number; category?: string; search?: string }
): Promise<DatabaseResult<PaginatedCollectionResponse>> => {
  try {
    const params = new URLSearchParams({ page: String(options.page), limit: String(options.limit) });
    if (options.category) params.set('category', options.category);
    if (options.search) params.set('search', options.search);
    const response = await collectionsApiRequest<{
      items: ApiCollectionRow[];
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    }>(`/collections?${params}`);
    return {
      success: true,
      data: {
        collections: response.items.map(apiRowToCollection),
        page: response.page,
        limit: response.limit,
        total: response.total,
        hasMore: response.hasMore,
      },
    };
  } catch (error) {
    console.error('Error getting collection page:', error);
    return { success: false, error: error instanceof ApiError ? error.message : error };
  }
};

/**
 * Get collections by category
 */
export const getCollectionsByCategory = async (
  category: string
): Promise<DatabaseResult<Collection[]>> => {
  return await getCollections({ category });
};

/**
 * Search collections by name/category/description (client-side filter over the full list)
 */
export const searchCollections = async (
  searchTerm: string
): Promise<DatabaseResult<Collection[]>> => {
  try {
    const allCollections = await getCollections();
    if (!allCollections.success || !allCollections.data) {
      return allCollections;
    }

    const term = searchTerm.toLowerCase();
    const filteredCollections = allCollections.data.filter(
      (collection) =>
        collection.name.toLowerCase().includes(term) ||
        collection.category.toLowerCase().includes(term) ||
        (collection.description && collection.description.toLowerCase().includes(term))
    );

    return { success: true, data: filteredCollections };
  } catch (error) {
    console.error('Error searching collections:', error);
    return { success: false, error: errorMessage(error, 'Failed to search collections') };
  }
};
