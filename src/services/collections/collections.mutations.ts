// src/services/collections/collections.mutations.ts
import { collectionsApiRequest, errorMessage, ApiError } from './collectionsApi';
import {
  apiRowToCollection,
  apiDetailRowToCollection,
  buildSyncPayload,
  type ApiCollectionRow,
} from './collections.mapper';
import type { Collection, CollectionContentType, DatabaseResult } from './collections.types';

const CONTENT_TYPES: CollectionContentType[] = ['products', 'labor', 'tools', 'equipment'];

/**
 * Create a new collection with default values
 */
export const createCollection = async (
  collectionData: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DatabaseResult> => {
  try {
    if (!collectionData.name || !collectionData.category) {
      return { success: false, error: 'Name and category are required' };
    }

    const body = {
      name: collectionData.name,
      category: collectionData.category,
      description: collectionData.description || '',
      estimatedHours: collectionData.estimatedHours ?? 0,
      taxRate: collectionData.taxRate ?? 0.07,
      categorySelection: collectionData.categorySelection || {
        trade: '',
        sections: [],
        categories: [],
        subcategories: [],
        types: [],
        description: '',
      },
    };

    const row = await collectionsApiRequest<ApiCollectionRow>('/collections', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return { success: true, id: String(row.id), data: apiRowToCollection(row) };
  } catch (error) {
    console.error('❌ Error creating collection:', error);
    return { success: false, error: errorMessage(error, 'Failed to create collection') };
  }
};

/**
 * Update collection metadata (name, description, categorySelection)
 */
export const updateCollectionMetadata = async (
  collectionId: string,
  metadata: {
    name?: string;
    description?: string;
    categorySelection?: any;
  }
): Promise<DatabaseResult> => {
  try {
    const row = await collectionsApiRequest<ApiCollectionRow>(`/collections/${collectionId}`, {
      method: 'PATCH',
      body: JSON.stringify(metadata),
    });
    return { success: true, data: apiRowToCollection(row) };
  } catch (error) {
    console.error('❌ Error updating collection metadata:', error);
    return { success: false, error: errorMessage(error, 'Failed to update collection metadata') };
  }
};

/**
 * Update collection tax rate
 */
export const updateCollectionTaxRate = async (
  collectionId: string,
  taxRate: number
): Promise<DatabaseResult> => {
  try {
    if (taxRate < 0 || taxRate > 1) {
      return { success: false, error: 'Tax rate must be between 0 and 1 (0% to 100%)' };
    }

    const row = await collectionsApiRequest<ApiCollectionRow>(
      `/collections/${collectionId}/tax-rate`,
      {
        method: 'PATCH',
        body: JSON.stringify({ taxRate }),
      }
    );
    return { success: true, data: apiRowToCollection(row) };
  } catch (error) {
    console.error('❌ Error updating tax rate:', error);
    return { success: false, error: errorMessage(error, 'Failed to update tax rate') };
  }
};

/**
 * Update the lastAccessedAt timestamp for a collection
 */
export const updateCollectionLastAccessed = async (
  collectionId: string
): Promise<DatabaseResult> => {
  try {
    const row = await collectionsApiRequest<ApiCollectionRow>(
      `/collections/${collectionId}/last-accessed`,
      { method: 'PATCH' }
    );
    return { success: true, data: apiRowToCollection(row) };
  } catch (error) {
    console.error('❌ Error updating lastAccessedAt:', error);
    return { success: false, error: errorMessage(error, 'Failed to update lastAccessedAt') };
  }
};

/**
 * MASTER SAVE FUNCTION
 * Saves tab/selection changes to the backend. The old Firestore version did a
 * single document write for all 4 content types at once; the new backend
 * syncs one content type per call (PUT /:id/:contentType/sync), so this
 * fires one request per content type present in `updates` and returns the
 * final nested collection from the last successful call.
 */
export const saveCollectionChanges = async (
  collectionId: string,
  updates: {
    productCategoryTabs?: any[];
    productSelections?: Record<string, any>;
    laborCategoryTabs?: any[];
    laborSelections?: Record<string, any>;
    toolCategoryTabs?: any[];
    toolSelections?: Record<string, any>;
    equipmentCategoryTabs?: any[];
    equipmentSelections?: Record<string, any>;
    categorySelection?: any;
  }
): Promise<DatabaseResult<Collection>> => {
  try {
    const tabsField: Record<CollectionContentType, keyof typeof updates> = {
      products: 'productCategoryTabs',
      labor: 'laborCategoryTabs',
      tools: 'toolCategoryTabs',
      equipment: 'equipmentCategoryTabs',
    };
    const selectionsField: Record<CollectionContentType, keyof typeof updates> = {
      products: 'productSelections',
      labor: 'laborSelections',
      tools: 'toolSelections',
      equipment: 'equipmentSelections',
    };

    let lastRow: ApiCollectionRow | null = null;

    for (const contentType of CONTENT_TYPES) {
      const tabs = updates[tabsField[contentType]] as any[] | undefined;
      const selections = updates[selectionsField[contentType]] as Record<string, any> | undefined;

      if (tabs === undefined && selections === undefined) continue;

      const payload = buildSyncPayload(tabs ?? [], selections ?? {});

      lastRow = await collectionsApiRequest<ApiCollectionRow>(
        `/collections/${collectionId}/${contentType}/sync`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      );
    }

    if (updates.categorySelection !== undefined) {
      lastRow = await collectionsApiRequest<ApiCollectionRow>(`/collections/${collectionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ categorySelection: updates.categorySelection }),
      });
    }

    if (!lastRow) {
      return { success: true };
    }

    return { success: true, data: apiDetailRowToCollection(lastRow) };
  } catch (error) {
    console.error('❌ Error saving collection changes:', error);
    return { success: false, error: errorMessage(error, 'Failed to save collection changes') };
  }
};

/**
 * Delete a collection
 */
export const deleteCollection = async (collectionId: string): Promise<DatabaseResult> => {
  try {
    await collectionsApiRequest<void>(`/collections/${collectionId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting collection:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete collection') };
  }
};

/**
 * Duplicate a collection
 */
export const duplicateCollection = async (
  collectionId: string,
  newName?: string
): Promise<DatabaseResult> => {
  try {
    const row = await collectionsApiRequest<ApiCollectionRow>(
      `/collections/${collectionId}/duplicate`,
      {
        method: 'POST',
        body: JSON.stringify(newName ? { name: newName } : {}),
      }
    );
    return { success: true, id: String(row.id), data: apiDetailRowToCollection(row) };
  } catch (error) {
    console.error('❌ Error duplicating collection:', error);
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error };
  }
};
