const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

type ModuleType = 'labor' | 'tools' | 'equipment';

class HierarchyCacheManager {
  private getCacheKey(module: ModuleType, type: 'trades' | 'sections' | 'categories' | 'subcategories', id: string): string {
    return `${module}_hierarchy_${type}_${id}`;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > CACHE_DURATION;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    try {
      const entry: CacheEntry<T> = JSON.parse(cached);
      if (this.isExpired(entry.timestamp)) {
        localStorage.removeItem(key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  private setInCache<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(entry));
  }

  // Trades
  getTrades(module: ModuleType, userId: string): any[] | null {
    const key = this.getCacheKey(module, 'trades', userId);
    return this.getFromCache(key);
  }

  setTrades(module: ModuleType, userId: string, trades: any[]): void {
    const key = this.getCacheKey(module, 'trades', userId);
    this.setInCache(key, trades);
  }

  // Sections
  getSections(module: ModuleType, tradeId: string, userId: string): any[] | null {
    const key = this.getCacheKey(module, 'sections', `${tradeId}_${userId}`);
    return this.getFromCache(key);
  }

  setSections(module: ModuleType, tradeId: string, userId: string, sections: any[]): void {
    const key = this.getCacheKey(module, 'sections', `${tradeId}_${userId}`);
    this.setInCache(key, sections);
  }

  clearSectionsForTrade(module: ModuleType, tradeId: string, userId: string): void {
    const key = this.getCacheKey(module, 'sections', `${tradeId}_${userId}`);
    localStorage.removeItem(key);
  }

  // Categories
  getCategories(module: ModuleType, sectionId: string, userId: string): any[] | null {
    const key = this.getCacheKey(module, 'categories', `${sectionId}_${userId}`);
    return this.getFromCache(key);
  }

  setCategories(module: ModuleType, sectionId: string, userId: string, categories: any[]): void {
    const key = this.getCacheKey(module, 'categories', `${sectionId}_${userId}`);
    this.setInCache(key, categories);
  }

  clearCategoriesForSection(module: ModuleType, sectionId: string, userId: string): void {
    const key = this.getCacheKey(module, 'categories', `${sectionId}_${userId}`);
    localStorage.removeItem(key);
  }

  // Subcategories (Tools/Equipment only)
  getSubcategories(module: ModuleType, categoryId: string, userId: string): any[] | null {
    const key = this.getCacheKey(module, 'subcategories', `${categoryId}_${userId}`);
    return this.getFromCache(key);
  }

  setSubcategories(module: ModuleType, categoryId: string, userId: string, subcategories: any[]): void {
    const key = this.getCacheKey(module, 'subcategories', `${categoryId}_${userId}`);
    this.setInCache(key, subcategories);
  }

  clearSubcategoriesForCategory(module: ModuleType, categoryId: string, userId: string): void {
    const key = this.getCacheKey(module, 'subcategories', `${categoryId}_${userId}`);
    localStorage.removeItem(key);
  }

  // Clear all for a module
  clearAll(module: ModuleType): void {
    const prefix = `${module}_hierarchy_`;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

export const hierarchyCache = new HierarchyCacheManager();

// Backward compatibility exports
export const laborHierarchyCache = {
  getTrades: (userId: string) => hierarchyCache.getTrades('labor', userId),
  setTrades: (userId: string, trades: any[]) => hierarchyCache.setTrades('labor', userId, trades),
  getSections: (tradeId: string, userId: string) => hierarchyCache.getSections('labor', tradeId, userId),
  setSections: (tradeId: string, userId: string, sections: any[]) => hierarchyCache.setSections('labor', tradeId, userId, sections),
  clearSectionsForTrade: (tradeId: string, userId: string) => hierarchyCache.clearSectionsForTrade('labor', tradeId, userId),
  getCategories: (sectionId: string, userId: string) => hierarchyCache.getCategories('labor', sectionId, userId),
  setCategories: (sectionId: string, userId: string, categories: any[]) => hierarchyCache.setCategories('labor', sectionId, userId, categories),
  clearCategoriesForSection: (sectionId: string, userId: string) => hierarchyCache.clearCategoriesForSection('labor', sectionId, userId),
  clearAll: () => hierarchyCache.clearAll('labor')
};