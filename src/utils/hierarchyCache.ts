const CACHE_KEY_PREFIX = 'labor_hierarchy_';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class LaborHierarchyCacheManager {
  private getCacheKey(type: 'trades' | 'sections' | 'categories', id: string): string {
    return `${CACHE_KEY_PREFIX}${type}_${id}`;
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
  getTrades(userId: string): any[] | null {
    const key = this.getCacheKey('trades', userId);
    return this.getFromCache(key);
  }

  setTrades(userId: string, trades: any[]): void {
    const key = this.getCacheKey('trades', userId);
    this.setInCache(key, trades);
  }

  // Sections
  getSections(tradeId: string, userId: string): any[] | null {
    const key = this.getCacheKey('sections', `${tradeId}_${userId}`);
    return this.getFromCache(key);
  }

  setSections(tradeId: string, userId: string, sections: any[]): void {
    const key = this.getCacheKey('sections', `${tradeId}_${userId}`);
    this.setInCache(key, sections);
  }

  clearSectionsForTrade(tradeId: string, userId: string): void {
    const key = this.getCacheKey('sections', `${tradeId}_${userId}`);
    localStorage.removeItem(key);
  }

  // Categories
  getCategories(sectionId: string, userId: string): any[] | null {
    const key = this.getCacheKey('categories', `${sectionId}_${userId}`);
    return this.getFromCache(key);
  }

  setCategories(sectionId: string, userId: string, categories: any[]): void {
    const key = this.getCacheKey('categories', `${sectionId}_${userId}`);
    this.setInCache(key, categories);
  }

  clearCategoriesForSection(sectionId: string, userId: string): void {
    const key = this.getCacheKey('categories', `${sectionId}_${userId}`);
    localStorage.removeItem(key);
  }

  // Clear all
  clearAll(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}

export const laborHierarchyCache = new LaborHierarchyCacheManager();