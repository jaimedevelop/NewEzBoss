// src/services/collections/collections.stats.ts
import { getCollections } from './collections.queries';
import type { DatabaseResult, CollectionStats, CollectionContentType } from './collections.types';

/**
 * Get collections statistics
 */
export const getCollectionsStats = async (): Promise<DatabaseResult<CollectionStats>> => {
  try {
    const result = await getCollections();
    if (!result.success || !result.data) {
      return result;
    }

    const collections = result.data;
    const total = collections.length;

    // Count by category
    const byCategory = collections.reduce((acc, collection) => {
      acc[collection.category] = (acc[collection.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count by content type (based on which tabs exist)
    const byContentType: Record<CollectionContentType, number> = {
      products: 0,
      labor: 0,
      tools: 0,
      equipment: 0,
    };

    collections.forEach(collection => {
      if (collection.productCategoryTabs && collection.productCategoryTabs.length > 0) {
        byContentType.products++;
      }
      if (collection.laborCategoryTabs && collection.laborCategoryTabs.length > 0) {
        byContentType.labor++;
      }
      if (collection.toolCategoryTabs && collection.toolCategoryTabs.length > 0) {
        byContentType.tools++;
      }
      if (collection.equipmentCategoryTabs && collection.equipmentCategoryTabs.length > 0) {
        byContentType.equipment++;
      }
    });

    // Calculate average hours
    const averageHours = total > 0 
      ? collections.reduce((sum, c) => sum + (c.estimatedHours || 0), 0) / total 
      : 0;

    return {
      success: true,
      data: {
        total,
        byCategory,
        byContentType,
        averageHours: Math.round(averageHours * 10) / 10,
      },
    };
  } catch (error) {
    console.error('Error getting collections stats:', error);
    return { success: false, error };
  }
};