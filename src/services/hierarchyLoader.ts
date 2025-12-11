// src/services/hierarchyLoader.ts
import {
  getProductTrades,
  getProductSections,
  getProductCategories,
  getProductSubcategories,
  getProductTypes,
  getProductSizes,
} from './categories';
import {
  ProductTrade,
  ProductSection,
  ProductCategory,
  ProductSubcategory,
  ProductType,
  ProductSize
} from './categories/types'
import { getBrands } from './inventory/products/brands';

interface HierarchyCache {
  trades: string[] | null;
  tradesObjects: ProductTrade[] | null;
  brands: Array<{ value: string; label: string }> | null;
  sections: Map<string, ProductSection[]>;
  categories: Map<string, ProductCategory[]>;
  subcategories: Map<string, ProductSubcategory[]>;
  types: Map<string, ProductType[]>;
  sizes: Map<string, ProductSize[]>;
  lastFetch: Map<string, number>;
}

interface HierarchyLoadResult {
  trades: string[];
  tradesObjects: ProductTrade[];
  brands: Array<{ value: string; label: string }>;
  sections: ProductSection[];
  categories: ProductCategory[];
  subcategories: ProductSubcategory[];
  types: ProductType[];
  sizes: ProductSize[];
  localIds: {
    tradeId: string;
    sectionId: string;
    categoryId: string;
    subcategoryId: string;
  };
}

class HierarchyLoader {
  private cache: HierarchyCache = {
    trades: null,
    tradesObjects: null,
    brands: null,
    sections: new Map(),
    categories: new Map(),
    subcategories: new Map(),
    types: new Map(),
    sizes: new Map(),
    lastFetch: new Map()
  };

  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private isCacheValid(key: string): boolean {
    const lastFetch = this.cache.lastFetch.get(key);
    if (!lastFetch) return false;
    return Date.now() - lastFetch < this.CACHE_DURATION;
  }

  async loadCompleteHierarchy(
    productData: {
      trade?: string;
      section?: string;
      category?: string;
      subcategory?: string;
      type?: string;
    },
    userId: string
  ): Promise<HierarchyLoadResult> {
    const result: HierarchyLoadResult = {
      trades: [],
      tradesObjects: [],
      brands: [],
      sections: [],
      categories: [],
      subcategories: [],
      types: [],
      sizes: [],
      localIds: {
        tradeId: '',
        sectionId: '',
        categoryId: '',
        subcategoryId: ''
      }
    };

    // Phase 1: Load base data (trades and brands) in parallel
    const basePromises = [];
    
    if (!this.cache.tradesObjects || !this.isCacheValid('trades')) {
      basePromises.push(
        getProductTrades(userId).then(res => {
          if (res.success && res.data) {
            this.cache.tradesObjects = res.data;
            this.cache.trades = res.data.map(t => t.name);
            this.cache.lastFetch.set('trades', Date.now());
          }
        })
      );
    }

    if (!this.cache.brands || !this.isCacheValid('brands')) {
      basePromises.push(
        getBrands(userId).then(res => {
          if (res.success && res.data) {
            this.cache.brands = res.data.map(b => ({ value: b.name, label: b.name }));
            this.cache.lastFetch.set('brands', Date.now());
          }
        })
      );
    }

    await Promise.all(basePromises);
    
    result.trades = this.cache.trades || [];
    result.tradesObjects = this.cache.tradesObjects || [];
    result.brands = this.cache.brands || [];

    // Phase 2: If we have product data, load the hierarchy path efficiently
    if (productData.trade) {
      const tradeObject = this.cache.tradesObjects?.find(t => t.name === productData.trade);
      const tradeId = tradeObject?.id || '';
      result.localIds.tradeId = tradeId;

      if (tradeId) {
        // Load sections and sizes for the trade (parallel)
        const tradePromises = [];
        
        const sectionsCacheKey = `sections-${tradeId}`;
        if (!this.cache.sections.has(tradeId) || !this.isCacheValid(sectionsCacheKey)) {
          tradePromises.push(
            getProductSections(tradeId, userId).then(res => {
              if (res.success && res.data) {
                this.cache.sections.set(tradeId, res.data);
                this.cache.lastFetch.set(sectionsCacheKey, Date.now());
              }
            })
          );
        }

        const sizesCacheKey = `sizes-${tradeId}`;
        if (!this.cache.sizes.has(tradeId) || !this.isCacheValid(sizesCacheKey)) {
          tradePromises.push(
            // ✅ FIXED: Swapped parameter order (userId first, tradeId second)
            getProductSizes(userId, tradeId).then(res => {
              if (res.success && res.data) {
                this.cache.sizes.set(tradeId, res.data);
                this.cache.lastFetch.set(sizesCacheKey, Date.now());
              }
            })
          );
        }

        await Promise.all(tradePromises);
        
        result.sections = this.cache.sections.get(tradeId) || [];
        result.sizes = this.cache.sizes.get(tradeId) || [];

        // Find section ID and continue loading if needed
        if (productData.section && result.sections.length > 0) {
          const section = result.sections.find(s => s.name === productData.section);
          if (section?.id) {
            result.localIds.sectionId = section.id;

            // Load categories
            const categoriesCacheKey = `categories-${section.id}`;
            if (!this.cache.categories.has(section.id) || !this.isCacheValid(categoriesCacheKey)) {
              const catRes = await getProductCategories(section.id, userId);
              if (catRes.success && catRes.data) {
                this.cache.categories.set(section.id, catRes.data);
                this.cache.lastFetch.set(categoriesCacheKey, Date.now());
              }
            }
            result.categories = this.cache.categories.get(section.id) || [];

            // Continue down the hierarchy...
            if (productData.category && result.categories.length > 0) {
              const category = result.categories.find(c => c.name === productData.category);
              if (category?.id) {
                result.localIds.categoryId = category.id;

                // Load subcategories
                const subcategoriesCacheKey = `subcategories-${category.id}`;
                if (!this.cache.subcategories.has(category.id) || !this.isCacheValid(subcategoriesCacheKey)) {
                  const subRes = await getProductSubcategories(category.id, userId);
                  if (subRes.success && subRes.data) {
                    this.cache.subcategories.set(category.id, subRes.data);
                    this.cache.lastFetch.set(subcategoriesCacheKey, Date.now());
                  }
                }
                result.subcategories = this.cache.subcategories.get(category.id) || [];

                // Load types if needed
                if (productData.subcategory && result.subcategories.length > 0) {
                  const subcategory = result.subcategories.find(sc => sc.name === productData.subcategory);
                  if (subcategory?.id) {
                    result.localIds.subcategoryId = subcategory.id;

                    const typesCacheKey = `types-${subcategory.id}`;
                    if (!this.cache.types.has(subcategory.id) || !this.isCacheValid(typesCacheKey)) {
                      const typesRes = await getProductTypes(subcategory.id, userId);
                      if (typesRes.success && typesRes.data) {
                        this.cache.types.set(subcategory.id, typesRes.data);
                        this.cache.lastFetch.set(typesCacheKey, Date.now());
                      }
                    }
                    result.types = this.cache.types.get(subcategory.id) || [];
                  }
                }
              }
            }
          }
        }
      }
    }

    return result;
  }

  // Load data for a specific level when user changes selection
  async loadDependentData(
    level: 'sections' | 'categories' | 'subcategories' | 'types' | 'sizes',
    parentId: string,
    userId: string
  ) {
    switch (level) {
      case 'sections':
        const sectionsRes = await getProductSections(parentId, userId);
        if (sectionsRes.success && sectionsRes.data) {
          this.cache.sections.set(parentId, sectionsRes.data);
          this.cache.lastFetch.set(`sections-${parentId}`, Date.now());
          return sectionsRes.data;
        }
        break;
      case 'categories':
        const catRes = await getProductCategories(parentId, userId);
        if (catRes.success && catRes.data) {
          this.cache.categories.set(parentId, catRes.data);
          this.cache.lastFetch.set(`categories-${parentId}`, Date.now());
          return catRes.data;
        }
        break;
      case 'subcategories':
        const subRes = await getProductSubcategories(parentId, userId);
        if (subRes.success && subRes.data) {
          this.cache.subcategories.set(parentId, subRes.data);
          this.cache.lastFetch.set(`subcategories-${parentId}`, Date.now());
          return subRes.data;
        }
        break;
      case 'types':
        const typesRes = await getProductTypes(parentId, userId);
        if (typesRes.success && typesRes.data) {
          this.cache.types.set(parentId, typesRes.data);
          this.cache.lastFetch.set(`types-${parentId}`, Date.now());
          return typesRes.data;
        }
        break;
      case 'sizes':
        // ✅ FIXED: Swapped parameter order (userId first, parentId/tradeId second)
        const sizesRes = await getProductSizes(userId, parentId);
        if (sizesRes.success && sizesRes.data) {
          this.cache.sizes.set(parentId, sizesRes.data);
          this.cache.lastFetch.set(`sizes-${parentId}`, Date.now());
          return sizesRes.data;
        }
        break;
    }
    return [];
  }

  // Clear cache (useful when data is updated)
  clearCache() {
    this.cache = {
      trades: null,
      tradesObjects: null,
      brands: null,
      sections: new Map(),
      categories: new Map(),
      subcategories: new Map(),
      types: new Map(),
      sizes: new Map(),
      lastFetch: new Map()
    };
  }

  // Clear specific cache entries
  clearCacheForTrade(tradeId: string) {
    this.cache.sections.delete(tradeId);
    this.cache.sizes.delete(tradeId);
    this.cache.lastFetch.delete(`sections-${tradeId}`);
    this.cache.lastFetch.delete(`sizes-${tradeId}`);
  }
}

// Create singleton instance
export const hierarchyLoader = new HierarchyLoader();