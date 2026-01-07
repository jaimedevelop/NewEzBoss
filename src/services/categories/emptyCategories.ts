// src/services/categories/emptyCategories.ts
// Service to detect empty categories (leaf nodes with no products)

import { getProducts } from '../inventory/products/products.queries';
import { getProductTrades } from './trades';
import { DatabaseResult } from './types';
import type { InventoryProduct } from '../inventory/products/products.types';

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

/**
 * Find all empty categories (leaf nodes with no products)
 * @param userId - User ID to filter categories and products
 * @param onProgress - Optional callback to track progress
 */
export const findEmptyCategories = async (
  userId: string,
  onProgress?: (progress: ScanProgress) => void
): Promise<DatabaseResult<EmptyCategoriesResult>> => {
  try {
    onProgress?.({ current: 0, total: 100, stage: 'Loading products...' });
    
    // 1. Load all products
    const productsResult = await getProducts({});
    if (!productsResult.success || !productsResult.data) {
      return { 
        success: false, 
        error: 'Failed to load products' 
      };
    }
    const products: InventoryProduct[] = productsResult.data;

    onProgress?.({ current: 20, total: 100, stage: 'Loading category hierarchy...' });
    
    // 2. Build product path Set for O(1) lookup
    const productPaths = new Set<string>();
    products.forEach(p => {
      if (p.trade && p.section) {
        productPaths.add(`${p.trade}|${p.section}`);
      }
      if (p.trade && p.section && p.category) {
        productPaths.add(`${p.trade}|${p.section}|${p.category}`);
      }
      if (p.trade && p.section && p.category && p.subcategory) {
        productPaths.add(`${p.trade}|${p.section}|${p.category}|${p.subcategory}`);
      }
      if (p.trade && p.section && p.category && p.subcategory && p.type) {
        productPaths.add(`${p.trade}|${p.section}|${p.category}|${p.subcategory}|${p.type}`);
      }
    });

    onProgress?.({ current: 30, total: 100, stage: 'Loading hierarchy (parallel)...' });
    
    // 3. Load all hierarchy data IN PARALLEL using collectionGroup
    // This is the KEY optimization - replaces 15,000+ sequential queries with 4 parallel ones
    const { db } = await import('../../firebase/config');
    const { collectionGroup, query, where, getDocs } = await import('firebase/firestore');
    
    const [tradesResult, sectionsSnap, categoriesSnap, subcategoriesSnap, typesSnap] = await Promise.all([
      getProductTrades(userId),
      getDocs(query(collectionGroup(db, 'productSections'), where('userId', '==', userId))),
      getDocs(query(collectionGroup(db, 'productCategories'), where('userId', '==', userId))),
      getDocs(query(collectionGroup(db, 'productSubcategories'), where('userId', '==', userId))),
      getDocs(query(collectionGroup(db, 'productTypes'), where('userId', '==', userId)))
    ]);

    if (!tradesResult.success || !tradesResult.data) {
      return { 
        success: false, 
        error: 'Failed to load trades' 
      };
    }
    const trades = tradesResult.data;

    onProgress?.({ current: 60, total: 100, stage: 'Processing hierarchy...' });

    // Build maps for parent lookups
    const tradeMap = new Map(trades.map(t => [t.id!, t.name]));
    
    // Process sections
    const allSections = sectionsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        tradeName: tradeMap.get(data.tradeId) || '',
        tradeId: data.tradeId,
        userId: data.userId
      };
    });

    // Build section map for category lookups
    const sectionMap = new Map(allSections.map(s => [s.id, { name: s.name, tradeName: s.tradeName, tradeId: s.tradeId }]));

    // Process categories
    const allCategories = categoriesSnap.docs.map(doc => {
      const data = doc.data();
      const section = sectionMap.get(data.sectionId);
      return {
        id: doc.id,
        name: data.name,
        sectionId: data.sectionId,
        sectionName: section?.name || '',
        tradeName: section?.tradeName || '',
        tradeId: section?.tradeId || '',
        userId: data.userId
      };
    });

    // Build category map for subcategory lookups
    const categoryMap = new Map(allCategories.map(c => [c.id, { 
      name: c.name, 
      sectionName: c.sectionName, 
      sectionId: c.sectionId,
      tradeName: c.tradeName, 
      tradeId: c.tradeId 
    }]));

    // Process subcategories
    const allSubcategories = subcategoriesSnap.docs.map(doc => {
      const data = doc.data();
      const category = categoryMap.get(data.categoryId);
      return {
        id: doc.id,
        name: data.name,
        categoryId: data.categoryId,
        categoryName: category?.name || '',
        sectionId: category?.sectionId || '',
        sectionName: category?.sectionName || '',
        tradeName: category?.tradeName || '',
        tradeId: category?.tradeId || '',
        userId: data.userId
      };
    });

    // Build subcategory map for type lookups
    const subcategoryMap = new Map(allSubcategories.map(sc => [sc.id, {
      name: sc.name,
      categoryName: sc.categoryName,
      categoryId: sc.categoryId,
      sectionName: sc.sectionName,
      sectionId: sc.sectionId,
      tradeName: sc.tradeName,
      tradeId: sc.tradeId
    }]));

    // Process types
    const allTypes = typesSnap.docs.map(doc => {
      const data = doc.data();
      const subcategory = subcategoryMap.get(data.subcategoryId);
      return {
        id: doc.id,
        name: data.name,
        subcategoryId: data.subcategoryId,
        subcategoryName: subcategory?.name || '',
        categoryId: subcategory?.categoryId || '',
        categoryName: subcategory?.categoryName || '',
        sectionId: subcategory?.sectionId || '',
        sectionName: subcategory?.sectionName || '',
        tradeName: subcategory?.tradeName || '',
        tradeId: subcategory?.tradeId || '',
        userId: data.userId
      };
    });

    onProgress?.({ current: 80, total: 100, stage: 'Checking for empty categories...' });

    // 4. Identify leaf nodes using Set-based O(1) lookup
    const emptySections: EmptyCategoryItem[] = [];
    const emptyCategories: EmptyCategoryItem[] = [];
    const emptySubcategories: EmptyCategoryItem[] = [];
    const emptyTypes: EmptyCategoryItem[] = [];

    // Calculate total categories to check
    let totalCategories = allSections.length + allCategories.length + allSubcategories.length + allTypes.length;
    let checkedCategories = 0;

    onProgress?.({ current: 80, total: 100, stage: `Checking categories (0/${totalCategories})...` });

    // Check sections (leaf if no categories)
    for (const section of allSections) {
      const hasCategories = allCategories.some(c => c.sectionId === section.id);
      if (!hasCategories) {
        // It's a leaf node, check if it has products using Set (O(1))
        const path = `${section.tradeName}|${section.name}`;
        const hasProducts = productPaths.has(path);
        
        if (!hasProducts) {
          emptySections.push({
            id: section.id!,
            name: section.name,
            level: 'section',
            hierarchyPath: {
              trade: section.tradeName,
              tradeId: section.tradeId,
              section: section.name,
              sectionId: section.id
            }
          });
        }
      }
      
      checkedCategories++;
      const progress = 80 + Math.floor((checkedCategories / totalCategories) * 15);
      onProgress?.({ current: Math.min(progress, 95), total: 100, stage: `Checking categories (${checkedCategories}/${totalCategories})...` });
    }

    // Check categories (leaf if no subcategories)
    for (const category of allCategories) {
      const hasSubcategories = allSubcategories.some(sc => sc.categoryId === category.id);
      if (!hasSubcategories) {
        // It's a leaf node, check if it has products using Set (O(1))
        const path = `${category.tradeName}|${category.sectionName}|${category.name}`;
        const hasProducts = productPaths.has(path);
        
        if (!hasProducts) {
          emptyCategories.push({
            id: category.id!,
            name: category.name,
            level: 'category',
            hierarchyPath: {
              trade: category.tradeName,
              tradeId: category.tradeId,
              section: category.sectionName,
              sectionId: category.sectionId,
              category: category.name,
              categoryId: category.id
            }
          });
        }
      }
      
      checkedCategories++;
      const progress = 20 + Math.floor((checkedCategories / totalCategories) * 60);
      onProgress?.({ current: progress, total: 100, stage: `Checking categories (${checkedCategories}/${totalCategories})...` });
    }

    // Check subcategories (leaf if no types)
    for (const subcategory of allSubcategories) {
      const hasTypes = allTypes.some(t => t.subcategoryId === subcategory.id);
      if (!hasTypes) {
        // It's a leaf node, check if it has products using Set (O(1))
        const path = `${subcategory.tradeName}|${subcategory.sectionName}|${subcategory.categoryName}|${subcategory.name}`;
        const hasProducts = productPaths.has(path);
        
        if (!hasProducts) {
          emptySubcategories.push({
            id: subcategory.id!,
            name: subcategory.name,
            level: 'subcategory',
            hierarchyPath: {
              trade: subcategory.tradeName,
              tradeId: subcategory.tradeId,
              section: subcategory.sectionName,
              sectionId: subcategory.sectionId,
              category: subcategory.categoryName,
              categoryId: subcategory.categoryId,
              subcategory: subcategory.name,
              subcategoryId: subcategory.id
            }
          });
        }
      }
      
      checkedCategories++;
      const progress = 20 + Math.floor((checkedCategories / totalCategories) * 60);
      onProgress?.({ current: progress, total: 100, stage: `Checking categories (${checkedCategories}/${totalCategories})...` });
    }

    // Check types (always leaf nodes)
    for (const type of allTypes) {
      // Check if it has products using Set (O(1))
      const path = `${type.tradeName}|${type.sectionName}|${type.categoryName}|${type.subcategoryName}|${type.name}`;
      const hasProducts = productPaths.has(path);
      
      if (!hasProducts) {
        emptyTypes.push({
          id: type.id!,
          name: type.name,
          level: 'type',
          hierarchyPath: {
            trade: type.tradeName,
            tradeId: type.tradeId,
            section: type.sectionName,
            sectionId: type.sectionId,
            category: type.categoryName,
            categoryId: type.categoryId,
            subcategory: type.subcategoryName,
            subcategoryId: type.subcategoryId
          }
        });
      }
      
      checkedCategories++;
      const progress = 20 + Math.floor((checkedCategories / totalCategories) * 60);
      onProgress?.({ current: progress, total: 100, stage: `Checking categories (${checkedCategories}/${totalCategories})...` });
    }

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
