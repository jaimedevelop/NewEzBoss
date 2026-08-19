// ============================================================
// 🚧 TEMPORARY SERVICE - ACCOUNTING SECTION - TO BE MOVED LATER 🚧
// ============================================================
// src/services/collections/collections.calculations.ts

import { collectionsApiRequest, errorMessage } from './collectionsApi';
import type { CollectionCalculation, CollectionResponse } from './collections.types';

/**
 * Save calculator data to a collection
 */
export const saveCollectionCalculation = async (
  collectionId: string,
  calculation: CollectionCalculation
): Promise<CollectionResponse<void>> => {
  try {
    const body = {
      finalSalePrice: calculation.finalSalePrice,
      possibleSalePrice: calculation.possibleSalePrice,
      gainIncrease: calculation.gainIncrease,
      manualPriceEnabled: calculation.manualPriceEnabled,
      manualPrice: calculation.manualPrice,
      rows: calculation.rows.map((row) => ({
        name: row.name,
        isChecked: row.isChecked,
        currentPrice: row.currentPrice,
        alternativePrice: row.alternativePrice,
        taxEnabled: row.taxEnabled,
        taxRate: row.taxRate,
      })),
    };

    await collectionsApiRequest<void>(`/collections/${collectionId}/calculation`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Error saving calculator:', error);
    return { success: false, error: errorMessage(error, 'Failed to save calculator') };
  }
};

/**
 * Clear calculator data from a collection
 */
export const clearCollectionCalculation = async (
  collectionId: string
): Promise<CollectionResponse<void>> => {
  try {
    await collectionsApiRequest<void>(`/collections/${collectionId}/calculation`, {
      method: 'DELETE',
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing calculator:', error);
    return { success: false, error: errorMessage(error, 'Failed to clear calculator') };
  }
};

// ============================================================
// 🚧 END TEMPORARY SERVICE - ACCOUNTING SECTION 🚧
// ============================================================
