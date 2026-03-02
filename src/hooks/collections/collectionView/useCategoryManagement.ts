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
  const isStringArray = (arr: any[]): arr is string[] =>
    arr.length === 0 || typeof arr[0] === 'string';

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
    if (!itemMap.has(key)) itemMap.set(key, item);
  });

  return Array.from(itemMap.values());
};

// ─── Item grouping functions ────────────────────────────────────────────────

const groupProductsIntoTabs = (products: InventoryProduct[]): CategoryTab[] => {
  const grouped = products.reduce((acc, product) => {
    const key = `${product.section}-${product.category}`;
    if (!acc[key]) {
      acc[key] = { section: product.section, category: product.category, products: [] };
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
    subcategories: [...new Set(data.products.map(p => p.subcategory).filter(Boolean))],
    itemIds: data.products.map(p => p.id).filter(Boolean) as string[]
  }));
};

const groupLaborIntoTabs = (laborItems: LaborItem[]): CategoryTab[] => {
  const grouped = laborItems.reduce((acc, item) => {
    const key = `${item.sectionName}-${item.categoryName}`;
    if (!acc[key]) acc[key] = { section: item.sectionName, category: item.categoryName, items: [] };
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
    const key = `${item.sectionName}-${item.categoryName}`;
    if (!acc[key]) {
      acc[key] = { section: item.sectionName, category: item.categoryName, subcategories: new Set<string>(), items: [] };
    }
    if (item.subcategoryName) acc[key].subcategories.add(item.subcategoryName);
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
    const key = `${item.sectionName}-${item.categoryName}`;
    if (!acc[key]) {
      acc[key] = { section: item.sectionName, category: item.categoryName, subcategories: new Set<string>(), items: [] };
    }
    if (item.subcategoryName) acc[key].subcategories.add(item.subcategoryName);
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
 * Merge item-derived tabs with scaffold tabs from createTabsFromSelection.
 *
 * When a section is selected, createTabsFromSelection creates a single placeholder
 * tab (section name = category name). The real items belong to multiple categories
 * within that section. This function:
 *   1. Uses item-derived tabs as the source of truth for any section/category combo
 *      that has items.
 *   2. Keeps scaffold tabs (empty) for any category/subcategory selections that had
 *      no matching items — so the tab still appears in the UI.
 *   3. Discards section-placeholder tabs once real category tabs exist for that section.
 */
const mergeTabsWithScaffold = (
  itemTabs: CategoryTab[],
  scaffoldTabs: CategoryTab[],
  selection: CategorySelection
): CategoryTab[] => {
  const result = new Map<string, CategoryTab>();

  // Add all item-derived tabs first (these are authoritative)
  itemTabs.forEach(tab => result.set(`${tab.section}-${tab.category}`, tab));

  // Add scaffold tabs only for explicit category/subcategory selections that
  // have no item-derived tab. Skip section-placeholder tabs entirely when
  // item tabs already cover that section.
  const sectionsWithItems = new Set(itemTabs.map(t => t.section));

  scaffoldTabs.forEach(tab => {
    const key = `${tab.section}-${tab.category}`;

    // Skip section placeholders when items already created real tabs for that section
    const isSectionPlaceholder = tab.section === tab.category;
    if (isSectionPlaceholder && sectionsWithItems.has(tab.section)) return;

    // Only keep scaffold if no item tab already covers this key
    if (!result.has(key)) result.set(key, tab);
  });

  return Array.from(result.values());
};

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
    setIsUpdating(true);
    setUpdateError(null);

    try {
      let newItems: any[] = [];
      let newTabs: CategoryTab[] = [];

      // Scaffold tabs from selection — used for empty-category fallback
      const scaffoldTabs = createTabsFromSelection(newSelection, activeView);

      switch (activeView) {
        case 'products': {
          const result = await getProductsByCategories(newSelection, userId);
          if (!result.success || !result.data) throw new Error('Failed to fetch products');
          newItems = result.data;

          if (newItems.length > 0) {
            const itemTabs = groupProductsIntoTabs(newItems);
            newTabs = mergeTabsWithScaffold(itemTabs, scaffoldTabs, newSelection);
          } else {
            newTabs = scaffoldTabs;
          }
          break;
        }

        case 'labor': {
          const result = await getLaborItems(userId, {});
          if (!result.success || !result.data) throw new Error('Failed to fetch labor items');
          const allLabor = Array.isArray(result.data) ? result.data : result.data.laborItems || [];
          newItems = allLabor.filter((item: any) => matchesHierarchicalSelection(item, newSelection));

          if (newItems.length > 0) {
            const itemTabs = groupLaborIntoTabs(newItems);
            newTabs = mergeTabsWithScaffold(itemTabs, scaffoldTabs, newSelection);
          } else {
            newTabs = scaffoldTabs;
          }
          break;
        }

        case 'tools': {
          const result = await getTools(userId, {});
          if (!result.success || !result.data) throw new Error('Failed to fetch tools');
          const allTools = Array.isArray(result.data) ? result.data : [];
          newItems = allTools.filter((item: ToolItem) => matchesHierarchicalSelection(item, newSelection));

          if (newItems.length > 0) {
            const itemTabs = groupToolsIntoTabs(newItems);
            newTabs = mergeTabsWithScaffold(itemTabs, scaffoldTabs, newSelection);
          } else {
            newTabs = scaffoldTabs;
          }
          break;
        }

        case 'equipment': {
          const result = await getEquipment(userId, {});
          if (!result.success || !result.data) throw new Error('Failed to fetch equipment');
          const allEquipment = Array.isArray(result.data) ? result.data : [];
          newItems = allEquipment.filter((item: EquipmentItem) => matchesHierarchicalSelection(item, newSelection));

          if (newItems.length > 0) {
            const itemTabs = groupEquipmentIntoTabs(newItems);
            newTabs = mergeTabsWithScaffold(itemTabs, scaffoldTabs, newSelection);
          } else {
            newTabs = scaffoldTabs;
          }
          break;
        }
      }

      // ─── Merge categorySelection ──────────────────────────────────────────

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

      // ─── Build ItemSelections for new items ───────────────────────────────

      const newSelectionsToMerge: Record<string, ItemSelection> = {};

      newItems.forEach(item => {
        if (!item.id || liveSelections[item.id]) return;

        const itemSection = activeView === 'products' ? item.section : item.sectionName;
        const itemCategory = activeView === 'products' ? item.category : item.categoryName;

        const itemTab = newTabs.find(tab =>
          tab.section === itemSection && tab.category === itemCategory
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
        }
      });

      const updatedCollection = addCategoryToCollection(
        collection,
        newTabs,
        newSelectionsToMerge,
        mergedCategorySelection,
        activeView
      );

      setIsUpdating(false);
      return { updatedCollection, newSelections: newSelectionsToMerge };

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
      return removeCategoryFromCollection(collection, categoryTabId, activeView);
    } catch (error) {
      console.error('❌ Error removing category:', error);
      setUpdateError('Failed to remove category');
      return null;
    }
  }, []);

  const clearError = useCallback(() => setUpdateError(null), []);

  return { isUpdating, updateError, handleAddCategories, handleRemoveCategory, clearError };
};