// src/services/categories/emptyCategories.ts
// Service to detect empty categories (leaf nodes with no products)

import { getProducts } from '../inventory/products/products.queries';
import { getProductTrades } from './trades';
import { getProductSections } from './sections';
import { getProductCategories } from './categories';
import { getProductSubcategories } from './subcategories';
import { getProductTypes } from './productTypes';
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

    onProgress?.({ current: 10, total: 100, stage: 'Loading category hierarchy...' });
    
    // 2. Load all hierarchy data
    const tradesResult = await getProductTrades(userId);
    if (!tradesResult.success || !tradesResult.data) {
      return { 
        success: false, 
        error: 'Failed to load trades' 
      };
    }
    const trades = tradesResult.data;

    // Load all sections for all trades
    const allSections = [];
    const allCategories = [];
    const allSubcategories = [];
    const allTypes = [];

    // Track hierarchy loading progress
    let hierarchyItemsLoaded = 0;
    let estimatedHierarchyItems = trades.length * 10; // Rough estimate

    for (const trade of trades) {
      if (!trade.id) continue;

      const sectionsResult = await getProductSections(trade.id, userId);
      if (sectionsResult.success && sectionsResult.data) {
        const sectionsWithTrade = sectionsResult.data.map(s => ({
          ...s,
          tradeName: trade.name,
          tradeId: trade.id
        }));
        allSections.push(...sectionsWithTrade);
        
        hierarchyItemsLoaded++;
        const hierarchyProgress = 10 + Math.floor((hierarchyItemsLoaded / estimatedHierarchyItems) * 40);
        onProgress?.({ 
          current: Math.min(hierarchyProgress, 50), 
          total: 100, 
          stage: `Loading hierarchy (${allSections.length + allCategories.length + allSubcategories.length + allTypes.length} items)...` 
        });

        // Load categories for each section
        for (const section of sectionsResult.data) {
          if (!section.id) continue;

          const categoriesResult = await getProductCategories(section.id, userId);
          if (categoriesResult.success && categoriesResult.data) {
            const categoriesWithParent = categoriesResult.data.map(c => ({
              ...c,
              tradeName: trade.name,
              tradeId: trade.id,
              sectionName: section.name,
              sectionId: section.id
            }));
            allCategories.push(...categoriesWithParent);
            
            hierarchyItemsLoaded++;
            const hierarchyProgress = 10 + Math.floor((hierarchyItemsLoaded / estimatedHierarchyItems) * 40);
            onProgress?.({ 
              current: Math.min(hierarchyProgress, 50), 
              total: 100, 
              stage: `Loading hierarchy (${allSections.length + allCategories.length + allSubcategories.length + allTypes.length} items)...` 
            });

            // Load subcategories for each category
            for (const category of categoriesResult.data) {
              if (!category.id) continue;

              const subcategoriesResult = await getProductSubcategories(category.id, userId);
              if (subcategoriesResult.success && subcategoriesResult.data) {
                const subcategoriesWithParent = subcategoriesResult.data.map(sc => ({
                  ...sc,
                  tradeName: trade.name,
                  tradeId: trade.id,
                  sectionName: section.name,
                  sectionId: section.id,
                  categoryName: category.name,
                  categoryId: category.id
                }));
                allSubcategories.push(...subcategoriesWithParent);
                
                hierarchyItemsLoaded++;
                const hierarchyProgress = 10 + Math.floor((hierarchyItemsLoaded / estimatedHierarchyItems) * 40);
                onProgress?.({ 
                  current: Math.min(hierarchyProgress, 50), 
                  total: 100, 
                  stage: `Loading hierarchy (${allSections.length + allCategories.length + allSubcategories.length + allTypes.length} items)...` 
                });

                // Load types for each subcategory
                for (const subcategory of subcategoriesResult.data) {
                  if (!subcategory.id) continue;

                  const typesResult = await getProductTypes(subcategory.id, userId);
                  if (typesResult.success && typesResult.data) {
                    const typesWithParent = typesResult.data.map(t => ({
                      ...t,
                      tradeName: trade.name,
                      tradeId: trade.id,
                      sectionName: section.name,
                      sectionId: section.id,
                      categoryName: category.name,
                      categoryId: category.id,
                      subcategoryName: subcategory.name,
                      subcategoryId: subcategory.id
                    }));
                    allTypes.push(...typesWithParent);
                    
                    hierarchyItemsLoaded++;
                    const hierarchyProgress = 10 + Math.floor((hierarchyItemsLoaded / estimatedHierarchyItems) * 40);
                    onProgress?.({ 
                      current: Math.min(hierarchyProgress, 50), 
                      total: 100, 
                      stage: `Loading hierarchy (${allSections.length + allCategories.length + allSubcategories.length + allTypes.length} items)...` 
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    // 3. Identify leaf nodes
    const emptySections: EmptyCategoryItem[] = [];
    const emptyCategories: EmptyCategoryItem[] = [];
    const emptySubcategories: EmptyCategoryItem[] = [];
    const emptyTypes: EmptyCategoryItem[] = [];

    // Calculate total categories to check
    totalCategories = allSections.length + allCategories.length + allSubcategories.length + allTypes.length;
    checkedCategories = 0;

    onProgress?.({ current: 20, total: 100, stage: `Checking categories (0/${totalCategories})...` });

    // Check sections (leaf if no categories)
    for (const section of allSections) {
      const hasCategories = allCategories.some(c => c.sectionId === section.id);
      if (!hasCategories) {
        // It's a leaf node, check if it has products
        const hasProducts = products.some(p => 
          p.trade === section.tradeName && p.section === section.name
        );
        
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
      const progress = 20 + Math.floor((checkedCategories / totalCategories) * 60);
      onProgress?.({ current: progress, total: 100, stage: `Checking categories (${checkedCategories}/${totalCategories})...` });
    }

    // Check categories (leaf if no subcategories)
    for (const category of allCategories) {
      const hasSubcategories = allSubcategories.some(sc => sc.categoryId === category.id);
      if (!hasSubcategories) {
        // It's a leaf node, check if it has products
        const hasProducts = products.some(p => 
          p.trade === category.tradeName && 
          p.section === category.sectionName && 
          p.category === category.name
        );
        
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
        // It's a leaf node, check if it has products
        const hasProducts = products.some(p => 
          p.trade === subcategory.tradeName && 
          p.section === subcategory.sectionName && 
          p.category === subcategory.categoryName && 
          p.subcategory === subcategory.name
        );
        
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
      const hasProducts = products.some(p => 
        p.trade === type.tradeName && 
        p.section === type.sectionName && 
        p.category === type.categoryName && 
        p.subcategory === type.subcategoryName && 
        p.type === type.name
      );
      
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
