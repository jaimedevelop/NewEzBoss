// src/services/categories/emptyCategories.ts
// Service to detect empty categories (leaf nodes with no items)

import { getProducts } from '../inventory/products/products.queries';
import { getLaborItems } from '../inventory/labor/labor.queries';
import { getEquipment } from '../inventory/equipment/equipment.queries';
import { getTools } from '../inventory/tools/tool.queries';
import { getProductTrades } from './trades';
import { DatabaseResult } from './types';

/**
 * Represents an empty category with its hierarchical path
 */
export interface EmptyCategoryItem {
  id: string;
  name: string;
  level: 'section' | 'category' | 'subcategory' | 'type';
  hierarchyPath: {
    trade?: string;
    tradeId?: string;
    section?: string;
    sectionId?: string;
    category?: string;
    categoryId?: string;
    subcategory?: string;
    subcategoryId?: string;
  };
}

/**
 * Result structure grouping empty categories by level
 */
export interface EmptyCategoriesResult {
  sections: EmptyCategoryItem[];
  categories: EmptyCategoryItem[];
  subcategories: EmptyCategoryItem[];
  types: EmptyCategoryItem[];
}

/**
 * Progress callback for tracking scan progress
 */
export interface ScanProgress {
  current: number;
  total: number;
  stage: string;
}

export type InventoryModule = 'Products' | 'Labor' | 'Equipment' | 'Tools';

/**
 * Configuration for different inventory modules
 */
const MODULE_CONFIGS: Record<InventoryModule, {
  itemFetch: (userId: string) => Promise<{ success: boolean; data?: any[] }>;
  levels: ('section' | 'category' | 'subcategory' | 'type')[];
  collections: Partial<Record<'section' | 'category' | 'subcategory' | 'type', string>>;
  itemFields: Record<string, string>;
}> = {
  Products: {
    itemFetch: (_userId) => getProducts({}), // getProducts doesn't take userId as first arg? Wait.
    levels: ['section', 'category', 'subcategory', 'type'],
    collections: {
      section: 'productSections',
      category: 'productCategories',
      subcategory: 'productSubcategories',
      type: 'productTypes'
    },
    itemFields: {
      trade: 'trade',
      section: 'section',
      category: 'category',
      subcategory: 'subcategory',
      type: 'type'
    }
  },
  Labor: {
    itemFetch: (userId) => getLaborItems(userId),
    levels: ['section', 'category'],
    collections: {
      section: 'laborSections',
      category: 'laborCategories'
    },
    itemFields: {
      trade: 'tradeName',
      section: 'sectionName',
      category: 'categoryName'
    }
  },
  Equipment: {
    itemFetch: (userId) => getEquipment(userId),
    levels: ['section', 'category', 'subcategory'],
    collections: {
      section: 'equipmentSections',
      category: 'equipmentCategories',
      subcategory: 'equipmentSubcategories'
    },
    itemFields: {
      trade: 'tradeName',
      section: 'sectionName',
      category: 'categoryName',
      subcategory: 'subcategoryName'
    }
  },
  Tools: {
    itemFetch: (userId) => getTools(userId),
    levels: ['section', 'category', 'subcategory'],
    collections: {
      section: 'toolSections',
      category: 'toolCategories',
      subcategory: 'toolSubcategories'
    },
    itemFields: {
      trade: 'tradeName',
      section: 'sectionName',
      category: 'categoryName',
      subcategory: 'subcategoryName'
    }
  }
};

/**
 * Find all empty categories (leaf nodes with no items)
 * @param userId - User ID to filter categories and items
 * @param module - The inventory module to scan
 * @param onProgress - Optional callback to track progress
 */
export const findEmptyCategories = async (
  userId: string,
  module: InventoryModule = 'Products',
  onProgress?: (progress: ScanProgress) => void
): Promise<DatabaseResult<EmptyCategoriesResult>> => {
  try {
    const config = MODULE_CONFIGS[module];
    onProgress?.({ current: 0, total: 100, stage: `Loading ${module} items...` });
    
    // 1. Load all items
    const itemsResult = await config.itemFetch(userId);
    if (!itemsResult.success || !itemsResult.data) {
      return { 
        success: false, 
        error: `Failed to load ${module} items` 
      };
    }
    const items = itemsResult.data;

    onProgress?.({ current: 20, total: 100, stage: 'Processing item hierarchy...' });
    
    // 2. Build item path Set for O(1) lookup
    const itemPaths = new Set<string>();
    const fields = config.itemFields;
    
    items.forEach(p => {
      const parts: string[] = [];
      if (p[fields.trade]) {
        parts.push(p[fields.trade]);
        if (p[fields.section]) {
          parts.push(p[fields.section]);
          itemPaths.add(parts.join('|'));
          
          if (p[fields.category]) {
            parts.push(p[fields.category]);
            itemPaths.add(parts.join('|'));
            
            if (fields.subcategory && p[fields.subcategory]) {
              parts.push(p[fields.subcategory]);
              itemPaths.add(parts.join('|'));
              
              if (fields.type && p[fields.type]) {
                parts.push(p[fields.type]);
                itemPaths.add(parts.join('|'));
              }
            }
          }
        }
      }
    });

    onProgress?.({ current: 30, total: 100, stage: 'Loading hierarchy (parallel)...' });
    
    // 3. Load all hierarchy data IN PARALLEL using collectionGroup
    const { db } = await import('../../firebase/config');
    const { collectionGroup, query, where, getDocs } = await import('firebase/firestore');
    
    const promises: Promise<any>[] = [getProductTrades(userId)];
    
    config.levels.forEach(level => {
      const collName = config.collections[level];
      if (collName) {
        promises.push(getDocs(query(collectionGroup(db, collName), where('userId', '==', userId))));
      }
    });

    const results = await Promise.all(promises);
    const tradesResult = results[0];
    
    if (!tradesResult.success || !tradesResult.data) {
      return { success: false, error: 'Failed to load trades' };
    }
    const trades = tradesResult.data;
    const tradeMap = new Map<string, string>(trades.map((t: any) => [t.id!, t.name]));

    const snaphots: Record<string, any[]> = {};
    config.levels.forEach((level, index) => {
      const snap = results[index + 1];
      snaphots[level] = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    });

    onProgress?.({ current: 60, total: 100, stage: 'Processing hierarchy...' });

    // Process sections
    const allSections = snaphots.section?.map(data => ({
      ...data,
      tradeName: tradeMap.get(data.tradeId) || ''
    })) || [];
    const sectionMap = new Map(allSections.map(s => [s.id, s]));

    // Process categories
    const allCategories = snaphots.category?.map(data => {
      const section = sectionMap.get(data.sectionId);
      return {
        ...data,
        sectionName: section?.name || '',
        tradeName: section?.tradeName || '',
        tradeId: section?.tradeId || ''
      };
    }) || [];
    const categoryMap = new Map(allCategories.map(c => [c.id, c]));

    // Process subcategories
    const allSubcategories = snaphots.subcategory?.map(data => {
      const category = categoryMap.get(data.categoryId);
      return {
        ...data,
        categoryName: category?.name || '',
        sectionId: category?.sectionId || '',
        sectionName: category?.sectionName || '',
        tradeId: category?.tradeId || '',
        tradeName: category?.tradeName || ''
      };
    }) || [];
    const subcategoryMap = new Map(allSubcategories.map(sc => [sc.id, sc]));

    // Process types
    const allTypes = snaphots.type?.map(data => {
      const subcategory = subcategoryMap.get(data.subcategoryId);
      return {
        ...data,
        subcategoryName: subcategory?.name || '',
        categoryId: subcategory?.categoryId || '',
        categoryName: subcategory?.categoryName || '',
        sectionId: subcategory?.sectionId || '',
        sectionName: subcategory?.sectionName || '',
        tradeId: subcategory?.tradeId || '',
        tradeName: subcategory?.tradeName || ''
      };
    }) || [];

    onProgress?.({ current: 80, total: 100, stage: 'Checking for empty categories...' });

    const emptySections: EmptyCategoryItem[] = [];
    const emptyCategories: EmptyCategoryItem[] = [];
    const emptySubcategories: EmptyCategoryItem[] = [];
    const emptyTypes: EmptyCategoryItem[] = [];

    // Check sections (leaf if no categories)
    allSections.forEach(section => {
      const hasCategories = allCategories.some(c => c.sectionId === section.id);
      if (!hasCategories) {
        const path = `${section.tradeName}|${section.name}`;
        if (!itemPaths.has(path)) {
          emptySections.push({
            id: section.id,
            name: section.name,
            level: 'section',
            hierarchyPath: { trade: section.tradeName, tradeId: section.tradeId, section: section.name, sectionId: section.id }
          });
        }
      }
    });

    // Check categories (leaf if no subcategories AND no types if applicable)
    allCategories.forEach(category => {
      const hasChildren = 
        allSubcategories.some(sc => sc.categoryId === category.id) || 
        (allTypes.length > 0 && allTypes.some(t => t.categoryId === category.id)); // For Products case where types might be direct children? (Wait, products always has subcat?)
      
      if (!hasChildren) {
        const path = `${category.tradeName}|${category.sectionName}|${category.name}`;
        if (!itemPaths.has(path)) {
          emptyCategories.push({
            id: category.id,
            name: category.name,
            level: 'category',
            hierarchyPath: {
              trade: category.tradeName, tradeId: category.tradeId,
              section: category.sectionName, sectionId: category.sectionId,
              category: category.name, categoryId: category.id
            }
          });
        }
      }
    });

    // Check subcategories (leaf if no types)
    allSubcategories.forEach(subcategory => {
      const hasTypes = allTypes.some(t => t.subcategoryId === subcategory.id);
      if (!hasTypes) {
        const path = `${subcategory.tradeName}|${subcategory.sectionName}|${subcategory.categoryName}|${subcategory.name}`;
        if (!itemPaths.has(path)) {
          emptySubcategories.push({
            id: subcategory.id,
            name: subcategory.name,
            level: 'subcategory',
            hierarchyPath: {
              trade: subcategory.tradeName, tradeId: subcategory.tradeId,
              section: subcategory.sectionName, sectionId: subcategory.sectionId,
              category: subcategory.categoryName, categoryId: subcategory.categoryId,
              subcategory: subcategory.name, subcategoryId: subcategory.id
            }
          });
        }
      }
    });

    // Check types
    allTypes.forEach(type => {
      const path = `${type.tradeName}|${type.sectionName}|${type.categoryName}|${type.subcategoryName}|${type.name}`;
      if (!itemPaths.has(path)) {
        emptyTypes.push({
          id: type.id,
          name: type.name,
          level: 'type',
          hierarchyPath: {
            trade: type.tradeName, tradeId: type.tradeId,
            section: type.sectionName, sectionId: type.sectionId,
            category: type.categoryName, categoryId: type.categoryId,
            subcategory: type.subcategoryName, subcategoryId: type.subcategoryId,
            type: type.name, typeId: type.id
          } as any
        });
      }
    });

    onProgress?.({ current: 100, total: 100, stage: 'Complete!' });
    
    return {
      success: true,
      data: {
        sections: emptySections,
        categories: emptyCategories,
        subcategories: emptySubcategories,
        types: emptyTypes
      }
    };
  } catch (error) {
    console.error('Error finding empty categories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find empty categories'
    };
  }
};
