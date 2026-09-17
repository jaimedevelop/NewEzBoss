// src/services/collections/collections.mutations.ts
import { collectionsApiRequest, errorMessage, ApiError } from './collectionsApi';
import {
  apiRowToCollection,
  apiDetailRowToCollection,
  buildSyncPayload,
  type ApiCollectionRow,
} from './collections.mapper';
import type { Collection, CollectionContentType, DatabaseResult } from './collections.types';
import { saveErrorMessages } from './collections.save.utils';

const CONTENT_TYPES: CollectionContentType[] = ['products', 'labor', 'tools', 'equipment'];

export interface CollectionSaveUpdates {
  productCategoryTabs?: any[];
  productSelections?: Record<string, any>;
  laborCategoryTabs?: any[];
  laborSelections?: Record<string, any>;
  toolCategoryTabs?: any[];
  toolSelections?: Record<string, any>;
  equipmentCategoryTabs?: any[];
  equipmentSelections?: Record<string, any>;
  productQuantityUpdates?: Record<string, number>;
  laborQuantityUpdates?: Record<string, number>;
  toolQuantityUpdates?: Record<string, number>;
  equipmentQuantityUpdates?: Record<string, number>;
  categorySelection?: any;
}

/** A sync is transactional per content type, not across the whole save. */
export interface CollectionSaveResult extends DatabaseResult<Collection> {
  successfulContentTypes: CollectionContentType[];
  failedContentTypes: Partial<Record<CollectionContentType, string>>;
  metadataSaved: boolean;
  metadataError?: string;
  /** Server-normalized quantities returned by the delta endpoint. */
  savedQuantities: Partial<Record<CollectionContentType, Record<string, number>>>;
}

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

/** Cover changes are an immediate save and deliberately do not map a flat API
 * row over a detailed collection in UI state. */
export const uploadCollectionCoverImage = async (
  collectionId: string,
  file: File
): Promise<DatabaseResult<Pick<Collection, 'coverImageUrl' | 'coverImageStorageKey'>>> => {
  try {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return { success: false, error: 'Choose a JPEG, PNG, or WebP image' };
    }
    if (file.size > 5 * 1024 * 1024) return { success: false, error: 'Image must be 5MB or smaller' };
    const formData = new FormData();
    formData.append('file', file);
    const data = await collectionsApiRequest<{ coverImageUrl: string; coverImageStorageKey: string }>(
      `/collections/${collectionId}/cover-image`, { method: 'POST', body: formData }
    );
    return { success: true, data };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to upload collection image') };
  }
};

export const removeCollectionCoverImage = async (
  collectionId: string
): Promise<DatabaseResult<Pick<Collection, 'coverImageUrl' | 'coverImageStorageKey'>>> => {
  try {
    await collectionsApiRequest<void>(`/collections/${collectionId}/cover-image`, { method: 'DELETE' });
    return { success: true, data: { coverImageUrl: undefined, coverImageStorageKey: undefined } };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to remove collection image') };
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
  updates: CollectionSaveUpdates
): Promise<CollectionSaveResult> => {
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

    let authoritative: Collection | undefined;
    const successfulContentTypes: CollectionContentType[] = [];
    const failedContentTypes: Partial<Record<CollectionContentType, string>> = {};
    let metadataSaved = false;
    let metadataError: string | undefined;
    const savedQuantities: Partial<Record<CollectionContentType, Record<string, number>>> = {};

    for (const contentType of CONTENT_TYPES) {
      const quantityField = ({
        products: 'productQuantityUpdates', labor: 'laborQuantityUpdates',
        tools: 'toolQuantityUpdates', equipment: 'equipmentQuantityUpdates',
      } as const)[contentType];
      const quantityUpdates = updates[quantityField] as Record<string, number> | undefined;
      if (quantityUpdates !== undefined) {
        try {
          const response = await collectionsApiRequest<{ quantities: Record<string, number> }>(
            `/collections/${collectionId}/${contentType}/selection-quantities`,
            { method: 'PATCH', body: JSON.stringify({ quantities: quantityUpdates }) }
          );
          savedQuantities[contentType] = response.quantities;
          successfulContentTypes.push(contentType);
        } catch (error) {
          failedContentTypes[contentType] = errorMessage(error, `Failed to save ${contentType} quantities`);
        }
        continue;
      }

      const tabs = updates[tabsField[contentType]] as any[] | undefined;
      const selections = updates[selectionsField[contentType]] as Record<string, any> | undefined;

      if (tabs === undefined && selections === undefined) continue;
      // The current endpoint replaces both tables for a type. Never turn an
      // omitted companion into an empty collection of selections or tabs.
      if (tabs === undefined || selections === undefined) {
        failedContentTypes[contentType] = 'Complete tabs and selections are required for a replacement sync';
        continue;
      }

      try {
        const row = await collectionsApiRequest<ApiCollectionRow>(
          `/collections/${collectionId}/${contentType}/sync`,
          { method: 'PUT', body: JSON.stringify(buildSyncPayload(tabs, selections)) }
        );
        authoritative = apiDetailRowToCollection(row);
        successfulContentTypes.push(contentType);
      } catch (error) {
        failedContentTypes[contentType] = errorMessage(error, `Failed to save ${contentType}`);
      }
    }

    if (updates.categorySelection !== undefined) {
      try {
        // PATCH returns a flat row. Merge it into the last nested sync result
        // instead of mapping it as detail and accidentally blanking tabs.
        const row = await collectionsApiRequest<ApiCollectionRow>(`/collections/${collectionId}`, {
          method: 'PATCH', body: JSON.stringify({ categorySelection: updates.categorySelection }),
        });
        metadataSaved = true;
        if (authoritative) authoritative = { ...authoritative, ...apiRowToCollection(row),
          productCategoryTabs: authoritative.productCategoryTabs,
          laborCategoryTabs: authoritative.laborCategoryTabs,
          toolCategoryTabs: authoritative.toolCategoryTabs,
          equipmentCategoryTabs: authoritative.equipmentCategoryTabs,
          productSelections: authoritative.productSelections,
          laborSelections: authoritative.laborSelections,
          toolSelections: authoritative.toolSelections,
          equipmentSelections: authoritative.equipmentSelections,
        };
      } catch (error) {
        metadataError = errorMessage(error, 'Failed to save collection metadata');
      }
    }

    const errors = saveErrorMessages(failedContentTypes, metadataError);
    return {
      success: errors.length === 0,
      data: authoritative,
      error: errors.length ? errors.join('; ') : undefined,
      successfulContentTypes,
      failedContentTypes,
      metadataSaved,
      metadataError,
      savedQuantities,
    };
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
