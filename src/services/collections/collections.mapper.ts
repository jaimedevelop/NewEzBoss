// src/services/collections/collections.mapper.ts
// Converts between the backend's relational collection shape (flat row +
// categoryTabs[] + itemSelections[] keyed by numeric tab id) and the
// frontend's Collection shape (per-content-type tab arrays + selection maps
// keyed by itemId, mirroring the old Firestore document layout).
import type {
  Collection,
  CategoryTab,
  ItemSelection,
  CollectionContentType,
} from './collections.types';

const CONTENT_TYPES: CollectionContentType[] = ['products', 'labor', 'tools', 'equipment'];

interface ApiCategoryTabRow {
  id: number;
  contentType: CollectionContentType;
  name: string;
  section: string;
  category: string;
  subcategories?: string[] | null;
  tradeName?: string | null;
}

interface ApiItemSelectionRow {
  id: number;
  categoryTabId: number;
  productId?: number | null;
  laborId?: number | null;
  toolId?: number | null;
  equipmentId?: number | null;
  quantity?: number | null;
  itemName?: string | null;
  itemSku?: string | null;
  unitPrice?: number | null;
  rateType?: 'flat' | 'hourly' | null;
  selectedRateId?: string | null;
  estimatedHours?: number | null;
  isAssigned?: boolean | null;
  assignedTo?: string | null;
}

export interface ApiCollectionRow {
  id: number;
  name: string;
  category: string;
  description?: string | null;
  estimatedHours?: number | null;
  taxRate?: number | null;
  tradeId?: number | null;
  categorySelection?: any;
  tabGroupingPreferences?: any;
  userId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastAccessedAt?: string | null;
  categoryTabs?: ApiCategoryTabRow[];
  itemSelections?: ApiItemSelectionRow[];
  calculation?: {
    finalSalePrice?: number | null;
    possibleSalePrice?: number | null;
    gainIncrease?: number | null;
    manualPriceEnabled?: boolean | null;
    manualPrice?: number | null;
    lastUpdated?: string | null;
    rows?: Array<{
      id: number;
      name: string;
      isChecked?: boolean | null;
      currentPrice?: number | null;
      alternativePrice?: number | null;
      taxEnabled?: boolean | null;
      taxRate?: number | null;
    }> | null;
  } | null;
}

const emptyCategorySelection = () => ({
  trade: '',
  sections: [],
  categories: [],
  subcategories: [],
  types: [],
  description: '',
});

/**
 * Converts a flat list row (no categoryTabs/itemSelections) into a Collection
 * with empty tabs/selections. Used for GET / (list) and POST/PATCH responses
 * that don't include nested detail.
 */
export const apiRowToCollection = (row: ApiCollectionRow): Collection => {
  const base: Collection = {
    id: String(row.id),
    name: row.name,
    category: row.category,
    description: row.description ?? '',
    estimatedHours: row.estimatedHours ?? 0,
    categorySelection: row.categorySelection ?? emptyCategorySelection(),
    assignedProducts: [],
    productCategoryTabs: [],
    laborCategoryTabs: [],
    toolCategoryTabs: [],
    equipmentCategoryTabs: [],
    productSelections: {},
    laborSelections: {},
    toolSelections: {},
    equipmentSelections: {},
    taxRate: row.taxRate ?? 0.07,
    tabGroupingPreferences: row.tabGroupingPreferences ?? undefined,
    userId: row.userId != null ? String(row.userId) : undefined,
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
    lastAccessedAt: row.lastAccessedAt ?? undefined,
  };

  if (row.categoryTabs && row.itemSelections) {
    return applyNestedDetail(base, row.categoryTabs, row.itemSelections);
  }

  return base;
};

const tabsField = (contentType: CollectionContentType) =>
  ({
    products: 'productCategoryTabs',
    labor: 'laborCategoryTabs',
    tools: 'toolCategoryTabs',
    equipment: 'equipmentCategoryTabs',
  }[contentType] as keyof Collection);

const selectionsField = (contentType: CollectionContentType) =>
  ({
    products: 'productSelections',
    labor: 'laborSelections',
    tools: 'toolSelections',
    equipment: 'equipmentSelections',
  }[contentType] as keyof Collection);

const applyNestedDetail = (
  base: Collection,
  categoryTabs: ApiCategoryTabRow[],
  itemSelections: ApiItemSelectionRow[]
): Collection => {
  const collection: Collection = { ...base };

  for (const contentType of CONTENT_TYPES) {
    (collection as any)[tabsField(contentType)] = [];
    (collection as any)[selectionsField(contentType)] = {};
  }

  const tabsById = new Map<number, ApiCategoryTabRow>();
  for (const tab of categoryTabs) {
    tabsById.set(tab.id, tab);
    const contentType = tab.type ?? (tab as any).contentType;
    const uiTab: CategoryTab = {
      id: String(tab.id),
      type: contentType,
      name: tab.name,
      section: tab.section,
      category: tab.category,
      subcategories: tab.subcategories ?? [],
      itemIds: [],
      tradeName: tab.tradeName ?? undefined,
    };
    ((collection as any)[tabsField(contentType)] as CategoryTab[]).push(uiTab);
  }

  for (const sel of itemSelections) {
    const tab = tabsById.get(sel.categoryTabId);
    if (!tab) continue;
    const contentType = tab.type ?? (tab as any).contentType;
    const rawItemId =
      contentType === 'products'
        ? sel.productId
        : contentType === 'labor'
        ? sel.laborId
        : contentType === 'tools'
        ? sel.toolId
        : sel.equipmentId;
    if (rawItemId == null) continue;
    const itemId = String(rawItemId);

    const uiTab = ((collection as any)[tabsField(contentType)] as CategoryTab[]).find(
      (t) => t.id === String(tab.id)
    );
    if (uiTab && !uiTab.itemIds.includes(itemId)) {
      uiTab.itemIds.push(itemId);
    }

    const selection: ItemSelection = {
      isSelected: true,
      quantity: sel.quantity ?? 1,
      categoryTabId: String(sel.categoryTabId),
      addedAt: Date.now(),
      itemName: sel.itemName ?? undefined,
      itemSku: sel.itemSku ?? undefined,
      unitPrice: sel.unitPrice ?? undefined,
      rateType: sel.rateType ?? undefined,
      selectedRateId: sel.selectedRateId ?? undefined,
      estimatedHours: sel.estimatedHours ?? undefined,
      isAssigned: sel.isAssigned ?? undefined,
      assignedTo: sel.assignedTo ?? undefined,
    };
    ((collection as any)[selectionsField(contentType)] as Record<string, ItemSelection>)[itemId] =
      selection;
  }

  if (base.calculations === undefined) {
    // calculation gets attached separately by apiRowToCollection via row.calculation
  }

  return collection;
};

export const applyApiCalculation = (
  collection: Collection,
  calculation: ApiCollectionRow['calculation']
): Collection => {
  if (!calculation) return collection;
  return {
    ...collection,
    calculations: {
      finalSalePrice: calculation.finalSalePrice ?? 0,
      possibleSalePrice: calculation.possibleSalePrice ?? 0,
      gainIncrease: calculation.gainIncrease ?? 0,
      manualPriceEnabled: calculation.manualPriceEnabled ?? undefined,
      manualPrice: calculation.manualPrice ?? undefined,
      lastUpdated: calculation.lastUpdated ?? '',
      rows: (calculation.rows ?? []).map((r) => ({
        id: String(r.id),
        name: r.name,
        isChecked: r.isChecked ?? false,
        currentPrice: r.currentPrice ?? 0,
        alternativePrice: r.alternativePrice ?? 0,
        taxEnabled: r.taxEnabled ?? undefined,
        taxRate: r.taxRate ?? undefined,
      })),
    },
  };
};

export const apiDetailRowToCollection = (row: ApiCollectionRow): Collection => {
  const collection = apiRowToCollection(row);
  return applyApiCalculation(collection, row.calculation);
};

/**
 * Builds the { categoryTabs, itemSelections } body for
 * PUT /collections/:id/:contentType/sync from the frontend's tab array +
 * selection map for a single content type.
 */
export const buildSyncPayload = (
  tabs: CategoryTab[],
  selections: Record<string, ItemSelection>
) => {
  const categoryTabs = tabs.map((tab) => ({
    name: tab.name,
    section: tab.section,
    category: tab.category,
    subcategories: tab.subcategories,
    tradeName: tab.tradeName,
  }));

  const tabIndexById = new Map(tabs.map((tab, index) => [tab.id, index]));

  const itemSelections = Object.entries(selections)
    .map(([itemId, selection]) => {
      const categoryTabIndex = tabIndexById.get(selection.categoryTabId);
      if (categoryTabIndex === undefined) return null;
      return {
        categoryTabIndex,
        itemId: Number(itemId),
        quantity: selection.quantity,
        itemName: selection.itemName,
        itemSku: selection.itemSku,
        unitPrice: selection.unitPrice,
        rateType: selection.rateType,
        selectedRateId: selection.selectedRateId,
        estimatedHours: selection.estimatedHours,
        isAssigned: selection.isAssigned,
        assignedTo: selection.assignedTo,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return { categoryTabs, itemSelections };
};
