// src/hooks/collections/collectionView/useCategoryManagement.ts
import { useState, useCallback } from 'react';
import {
  Collection,
  CollectionContentType,
  CategoryTab,
  ItemSelection,
  addCategoryToCollection,
  removeCategoryFromCollection,
  createTabsFromSelection,
} from '../../../services/collections';
import { CategorySelection } from '../../../pages/collections/components/CollectionCategorySelector';
import {
  getProductsByCategories,
  type InventoryProduct
} from '../../../services/inventory/products';
import {
  getLaborItems,
  type LaborItem
} from '../../../services/inventory/labor';
import {
  getTools,
  type ToolItem
} from '../../../services/inventory/tools';
import {
  getEquipment,
  type EquipmentItem
} from '../../../services/inventory/equipment';
import { matchesHierarchicalSelection } from '../../../utils/categoryMatching';

interface HierarchicalCategoryItem {
  name: string;
  tradeId?: string;
  tradeName?: string;
  sectionId?: string;
  sectionName?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}

export interface UseCategoryManagementResult {
  isUpdating: boolean;
  updateError: string | null;
  handleAddCategories: (
    collection: Collection,
    newSelection: CategorySelection,
    activeView: CollectionContentType,
    userId: string,
    liveSelections: Record<string, ItemSelection>
  ) => Promise<{
    updatedCollection: Collection;
    newSelections: Record<string, ItemSelection>;
  } | null>;
  handleRemoveCategory: (
    collection: Collection,
    categoryTabId: string,
    activeView: CollectionContentType
  ) => Collection | null;
  clearError: () => void;
}

const mergeCategoryItems = (
  existing: string[] | HierarchicalCategoryItem[],
  newItems: string[] | HierarchicalCategoryItem[]
): string[] | HierarchicalCategoryItem[] => {
  const isStringArray = (arr: any[]): arr is string[] => {
    return arr.length === 0 || typeof arr[0] === 'string';
  };

  if (isStringArray(existing) && isStringArray(newItems)) {
    return Array.from(new Set([...existing, ...newItems]));
  }

  const existingObjects = existing as HierarchicalCategoryItem[];
  const newObjects = newItems as HierarchicalCategoryItem[];
  const itemMap = new Map<string, HierarchicalCategoryItem>();

  existingObjects.forEach(item => {
    const key = `${item.name}|${item.tradeName || ''}|${item.sectionName || ''}|${item.categoryName || ''}`;
    itemMap.set(key, item);
  });

  newObjects.forEach(item => {
    const key = `${item.name}|${item.tradeName || ''}|${item.sectionName || ''}|${item.categoryName || ''}`;
    if (!itemMap.has(key)) {
      itemMap.set(key, item);
    }
  });

  return Array.from(itemMap.values());
};

// Item grouping functions
const groupProductsIntoTabs = (products: InventoryProduct[]): CategoryTab[] => {
  const grouped = products.reduce((acc, product) => {
    const key = `${product.section}-${product.category}`;
    if (!acc[key]) {
      acc[key] = {
        section: product.section,
        category: product.category,
        products: []
      };
    }
    acc[key].products.push(product);
    return acc;
  }, {} as Record<string, { section: string; category: string; products: InventoryProduct[] }>);

  return Object.entries(grouped).map(([key, data]) => ({
    id: key,
    type: 'products' as CollectionContentType,
    name: data.category,
    section: data.section,
    category: data.category,
    subcategories: [...new Set(data.products.map(p => p.subcategory))],
    itemIds: data.products.map(p => p.id).filter(Boolean) as string[]
  }));
};

const groupLaborIntoTabs = (laborItems: LaborItem[]): CategoryTab[] => {
  const grouped = laborItems.reduce((acc, item) => {
    const section = item.sectionName;
    const category = item.categoryName;
    const key = `${section}-${category}`;

    if (!acc[key]) {
      acc[key] = { section, category, items: [] };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { section: string; category: string; items: LaborItem[] }>);

  return Object.entries(grouped).map(([key, data]) => ({
    id: key,
    type: 'labor' as CollectionContentType,
    name: data.category,
    section: data.section,
    category: data.category,
    subcategories: [],
    itemIds: data.items.map(item => item.id).filter(Boolean) as string[]
  }));
};

const groupToolsIntoTabs = (toolItems: ToolItem[]): CategoryTab[] => {
  const grouped = toolItems.reduce((acc, item) => {
    const section = item.sectionName;
    const category = item.categoryName;
    const key = `${section}-${category}`;

    if (!acc[key]) {
      acc[key] = { section, category, subcategories: new Set<string>(), items: [] };
    }
    if (item.subcategoryName) {
      acc[key].subcategories.add(item.subcategoryName);
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { section: string; category: string; subcategories: Set<string>; items: ToolItem[] }>);

  return Object.entries(grouped).map(([key, data]) => ({
    id: key,
    type: 'tools' as CollectionContentType,
    name: data.category,
    section: data.section,
    category: data.category,
    subcategories: Array.from(data.subcategories),
    itemIds: data.items.map(item => item.id).filter(Boolean) as string[]
  }));
};

const groupEquipmentIntoTabs = (equipmentItems: EquipmentItem[]): CategoryTab[] => {
  const grouped = equipmentItems.reduce((acc, item) => {
    const section = item.sectionName;
    const category = item.categoryName;
    const key = `${section}-${category}`;

    if (!acc[key]) {
      acc[key] = { section, category, subcategories: new Set<string>(), items: [] };
    }
    if (item.subcategoryName) {
      acc[key].subcategories.add(item.subcategoryName);
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { section: string; category: string; subcategories: Set<string>; items: EquipmentItem[] }>);

  return Object.entries(grouped).map(([key, data]) => ({
    id: key,
    type: 'equipment' as CollectionContentType,
    name: data.category,
    section: data.section,
    category: data.category,
    subcategories: Array.from(data.subcategories),
    itemIds: data.items.map(item => item.id).filter(Boolean) as string[]
  }));
};

/**
 * Manages category add/remove operations.
 * Handles item fetching, grouping, and collection updates.
 */
export const useCategoryManagement = (): UseCategoryManagementResult => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleAddCategories = useCallback(async (
    collection: Collection,
    newSelection: CategorySelection,
    activeView: CollectionContentType,
    userId: string,
    liveSelections: Record<string, ItemSelection>
  ) => {
    console.log('➕ CATEGORY ADD INITIATED');
    console.log('➕ Content Type:', activeView);

    setIsUpdating(true);
    setUpdateError(null);

    try {
      let newItems: any[] = [];
      let newTabs: CategoryTab[] = [];

      switch (activeView) {
        case 'products': {
          const result = await getProductsByCategories(newSelection, userId);
          if (!result.success || !result.data) {
            throw new Error('Failed to fetch products');
          }
          newItems = result.data;
          newTabs = newItems.length === 0
            ? createTabsFromSelection(newSelection, 'products')
            : groupProductsIntoTabs(newItems);
          break;
        }
        case 'labor': {
          // FIXED: Only 2 parameters
          const result = await getLaborItems(userId, {});
          if (!result.success || !result.data) {
            throw new Error('Failed to fetch labor items');
          }
          let allLabor = Array.isArray(result.data) ? result.data : result.data.laborItems || [];
          newItems = allLabor.filter(labor => matchesHierarchicalSelection(labor, newSelection));
          newTabs = newItems.length === 0
            ? createTabsFromSelection(newSelection, 'labor')
            : groupLaborIntoTabs(newItems);
          break;
        }
        case 'tools': {
          // FIXED: Only 2 parameters
          const result = await getTools(userId, {});
          if (!result.success || !result.data) {
            throw new Error('Failed to fetch tools');
          }
          let allTools = Array.isArray(result.data) ? result.data : [];
          newItems = allTools.filter(tool => matchesHierarchicalSelection(tool, newSelection));
          newTabs = newItems.length === 0
            ? createTabsFromSelection(newSelection, 'tools')
            : groupToolsIntoTabs(newItems);
          break;
        }
        case 'equipment': {
          // FIXED: Only 2 parameters
          const result = await getEquipment(userId, {});
          if (!result.success || !result.data) {
            throw new Error('Failed to fetch equipment');
          }
          let allEquipment = Array.isArray(result.data) ? result.data : [];
          newItems = allEquipment.filter((equipment: EquipmentItem) => 
            matchesHierarchicalSelection(equipment, newSelection)
          );
          newTabs = newItems.length === 0
            ? createTabsFromSelection(newSelection, 'equipment')
            : groupEquipmentIntoTabs(newItems);
          break;
        }
      }

      console.log('✅ Items fetched:', newItems.length);
      console.log('✅ Tabs created:', newTabs.length);

      const existingCategorySelection = collection.categorySelection || {
        trade: '', sections: [], categories: [], subcategories: [], types: [],
      };

      const mergedCategorySelection: CategorySelection = {
        trade: existingCategorySelection.trade || newSelection.trade,
        sections: mergeCategoryItems(
          existingCategorySelection.sections || [],
          newSelection.sections
        ) as any,
        categories: mergeCategoryItems(
          existingCategorySelection.categories || [],
          newSelection.categories
        ) as any,
        subcategories: mergeCategoryItems(
          existingCategorySelection.subcategories || [],
          newSelection.subcategories
        ) as any,
        types: mergeCategoryItems(
          existingCategorySelection.types || [],
          newSelection.types || []
        ) as any,
        description: newSelection.description || existingCategorySelection.description
      };

      const newSelectionsToMerge: Record<string, ItemSelection> = {};
      console.log('🔍 Debug info before creating selections:', {
  itemsCount: newItems.length,
  firstItem: newItems[0],
  tabsCount: newTabs.length,
  firstTab: newTabs[0],
  liveSelectionsCount: Object.keys(liveSelections).length
});
      newItems.forEach(item => {
        if (item.id && !liveSelections[item.id]) {
          // Get section/category names based on content type
          const itemSection = activeView === 'products' 
            ? item.section 
            : item.sectionName;
          const itemCategory = activeView === 'products' 
            ? item.category 
            : item.categoryName;

          const itemTab = newTabs.find(tab =>
            tab.section === itemSection &&
            tab.category === itemCategory
          );

          if (itemTab) {
            newSelectionsToMerge[item.id] = {
              isSelected: false,
              quantity: 1,
              categoryTabId: itemTab.id,
              addedAt: Date.now(),
              itemName: item.name,
              itemSku: item.sku || '',
              unitPrice: item.unitPrice || 0
            };
          } else {
            console.warn('⚠️ No matching tab found for item:', item.name, {
              section: itemSection,
              category: itemCategory,
              availableTabs: newTabs.map(t => ({ section: t.section, category: t.category }))
            });
          }
        }
      });

      console.log('✅ New selections created:', Object.keys(newSelectionsToMerge).length);

      const updatedCollection = addCategoryToCollection(
        collection,
        newTabs,
        newSelectionsToMerge,
        mergedCategorySelection,
        activeView
      );
      
console.log('🔍 Collection after addCategoryToCollection:', {
  productTabsCount: updatedCollection.productCategoryTabs?.length,
  productSelectionsCount: Object.keys(updatedCollection.productSelections || {}).length,
  tabsAdded: newTabs.length,
  selectionsAdded: Object.keys(newSelectionsToMerge).length
});
      setIsUpdating(false);
      return {
        updatedCollection,
        newSelections: newSelectionsToMerge
      };

    } catch (error) {
      console.error('❌ Error adding categories:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to update categories');
      setIsUpdating(false);
      return null;
    }
  }, []);

  const handleRemoveCategory = useCallback((
    collection: Collection,
    categoryTabId: string,
    activeView: CollectionContentType
  ) => {
    if (!window.confirm('Remove this category? All selected items will be unselected.')) {
      return null;
    }

    try {
      const updatedCollection = removeCategoryFromCollection(
        collection,
        categoryTabId,
        activeView
      );

      return updatedCollection;
    } catch (error) {
      console.error('❌ Error removing category:', error);
      setUpdateError('Failed to remove category');
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setUpdateError(null);
  }, []);

  return {
    isUpdating,
    updateError,
    handleAddCategories,
    handleRemoveCategory,
    clearError,
  };
};