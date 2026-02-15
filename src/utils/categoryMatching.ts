import type { CategorySelection } from '../services/collections';

interface HierarchicalCategoryItem {
  name: string;
  tradeName: string;
  sectionName?: string;
  categoryName?: string;
  subcategoryName?: string;
}

interface LegacyCategorySelection {
  trade?: string;
  sections: string[];
  categories: string[];
  subcategories: string[];
  types?: string[];
}

/**
 * Helper functions to normalize field access between content types
 */
const getTradeValue = (item: any): string => item.trade || item.tradeName || '';
const getSectionValue = (item: any): string => item.section || item.sectionName || '';
const getCategoryValue = (item: any): string => item.category || item.categoryName || '';
const getSubcategoryValue = (item: any): string => item.subcategory || item.subcategoryName || '';
const getTypeValue = (item: any): string => item.type || item.typeName || '';

/**
 * Check if selection uses hierarchical structure (objects with tradeName)
 */
const isHierarchicalStructure = (selection: CategorySelection): boolean => {
  const allArrays = [
    ...selection.sections,
    ...selection.categories,
    ...selection.subcategories,
    ...(selection.types || [])
  ];

  if (allArrays.length > 0) {
    const firstItem = allArrays[0];
    return typeof firstItem === 'object' && 'tradeName' in firstItem;
  }

  return true;
};

/**
 * Match item against hierarchical category selection
 */
export const matchesHierarchicalSelection = (
  item: any,
  selection: CategorySelection
): boolean => {
  if (!isHierarchicalStructure(selection)) {
    return matchesLegacySelection(item, selection as any);
  }

  // DEBUG: Specific logging for Ladder
  const isLadderItem = item.name?.toLowerCase().includes('ladder') || item.categoryName === 'Ladder' || item.subcategoryName === 'Ladder';
  const isLadderSelection = selection.categories.some(c => c.name === 'Ladder') || selection.subcategories.some(s => s.name === 'Ladder');

  if (isLadderItem && isLadderSelection) {
    console.log('🔍 [matchesHierarchicalSelection] Checking Ladder Item:', item.name);
    console.log('   - Item IDs:', {
      trade: item.tradeId, tradeName: getTradeValue(item),
      section: item.sectionId, sectionName: getSectionValue(item),
      category: item.categoryId, categoryName: getCategoryValue(item),
      subcategory: item.subcategoryId, subcategoryName: getSubcategoryValue(item)
    });
    console.log('   - Selection:', JSON.stringify(selection, null, 2));
  }

  // Helper to check ID match
  const matchesIdOrName = (
    itemId: string | undefined,
    itemName: string | undefined,
    targetId: string | undefined,
    targetName: string
  ): boolean => {
    // If both have IDs, prioritize ID match
    if (itemId && targetId) {
      return itemId === targetId;
    }
    // Fallback to name match
    return itemName === targetName;
  };

  // Trade level check
  if (selection.trade) {
    // If selection has tradeId (it might not in legacy Selection objects), use it
    // But CategorySelection interface uses `trade` string property for name usually
    // We check if item matches the trade name since selection.trade is a string
    // TODO: Ideally selection.trade should be an object with ID
    if (getTradeValue(item) !== selection.trade) {
      return false;
    }
  }

  const hasAnySelection =
    selection.sections.length > 0 ||
    selection.categories.length > 0 ||
    selection.subcategories.length > 0 ||
    (selection.types && selection.types.length > 0);

  if (!hasAnySelection) {
    return true;
  }

  const sections = selection.sections as Array<{
    id?: string;
    name: string;
    tradeId?: string;
    tradeName: string;
  }>;

  const categories = selection.categories as Array<{
    id?: string;
    name: string;
    tradeId?: string;
    tradeName: string;
    sectionId?: string;
    sectionName: string;
  }>;

  const subcategories = selection.subcategories as Array<{
    id?: string;
    name: string;
    tradeId?: string;
    tradeName: string;
    sectionId?: string;
    sectionName: string;
    categoryId?: string;
    categoryName: string;
  }>;

  const types = (selection.types || []) as Array<{
    id?: string;
    name: string;
    tradeId?: string;
    tradeName: string;
    sectionId?: string;
    sectionName: string;
    categoryId?: string;
    categoryName: string;
    subcategoryId?: string;
    subcategoryName: string;
  }>;

  if (sections.length > 0) {
    const sectionMatch = sections.some((s) => {
      const idMatch = matchesIdOrName(item.sectionId, getSectionValue(item), s.id, s.name);
      const tradeMatch = matchesIdOrName(item.tradeId, getTradeValue(item), s.tradeId, s.tradeName);
      return idMatch && tradeMatch;
    });
    if (sectionMatch) return true;
  }

  if (categories.length > 0) {
    const categoryMatch = categories.some((c) => {
      const idMatch = matchesIdOrName(item.categoryId, getCategoryValue(item), c.id, c.name);
      const sectionMatch = matchesIdOrName(item.sectionId, getSectionValue(item), c.sectionId, c.sectionName);
      const tradeMatch = matchesIdOrName(item.tradeId, getTradeValue(item), c.tradeId, c.tradeName);
      return idMatch && sectionMatch && tradeMatch;
    });
    if (categoryMatch) return true;
  }

  if (subcategories.length > 0) {
    const subcategoryMatch = subcategories.some((sc) => {
      const idMatch = matchesIdOrName(item.subcategoryId, getSubcategoryValue(item), sc.id, sc.name);
      const categoryMatch = matchesIdOrName(item.categoryId, getCategoryValue(item), sc.categoryId, sc.categoryName);
      const sectionMatch = matchesIdOrName(item.sectionId, getSectionValue(item), sc.sectionId, sc.sectionName);
      const tradeMatch = matchesIdOrName(item.tradeId, getTradeValue(item), sc.tradeId, sc.tradeName);

      return idMatch && categoryMatch && sectionMatch && tradeMatch;
    });
    if (subcategoryMatch) return true;
  }

  if (types.length > 0) {
    const typeMatch = types.some((t) => {
      // Products usually use 'type' field
      const typeValue = item.type || item.typeName || '';
      // Types might not have IDs consistently in all item types, so we rely on name for type usually
      // But we check hierarchy IDs
      const nameMatch = t.name === typeValue;

      const subcategoryMatch = matchesIdOrName(item.subcategoryId, getSubcategoryValue(item), t.subcategoryId, t.subcategoryName);
      const categoryMatch = matchesIdOrName(item.categoryId, getCategoryValue(item), t.categoryId, t.categoryName);
      const sectionMatch = matchesIdOrName(item.sectionId, getSectionValue(item), t.sectionId, t.sectionName);
      const tradeMatch = matchesIdOrName(item.tradeId, getTradeValue(item), t.tradeId, t.tradeName);

      return nameMatch && subcategoryMatch && categoryMatch && sectionMatch && tradeMatch;
    });
    if (typeMatch) return true;
  }

  return false;
};

/**
 * Legacy matching function (for flat string arrays)
 */
const matchesLegacySelection = (
  item: any,
  selection: LegacyCategorySelection
): boolean => {
  if (selection.trade && getTradeValue(item) !== selection.trade) {
    return false;
  }

  const sections = selection.sections as string[];
  const categories = selection.categories as string[];
  const subcategories = selection.subcategories as string[];
  const types = (selection.types || []) as string[];

  if (sections.length > 0 && !sections.includes(getSectionValue(item))) {
    return false;
  }

  if (categories.length > 0 && !categories.includes(getCategoryValue(item))) {
    return false;
  }

  if (subcategories.length > 0 && !sections.includes(getSubcategoryValue(item))) {
    return false;
  }

  if (types.length > 0 && !types.includes(getTypeValue(item))) {
    return false;
  }

  return true;
};