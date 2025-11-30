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

  if (selection.trade && getTradeValue(item) !== selection.trade) {
    return false;
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
    name: string;
    tradeName: string;
  }>;
  
  const categories = selection.categories as Array<{
    name: string;
    tradeName: string;
    sectionName: string;
  }>;
  
  const subcategories = selection.subcategories as Array<{
    name: string;
    tradeName: string;
    sectionName: string;
    categoryName: string;
  }>;
  
  const types = (selection.types || []) as Array<{
    name: string;
    tradeName: string;
    sectionName: string;
    categoryName: string;
    subcategoryName: string;
  }>;

  if (sections.length > 0) {
    const sectionMatch = sections.some((s) =>
      s.name === getSectionValue(item) &&
      s.tradeName === getTradeValue(item)
    );
    if (sectionMatch) return true;
  }

  if (categories.length > 0) {
    const categoryMatch = categories.some((c) =>
      c.name === getCategoryValue(item) &&
      c.sectionName === getSectionValue(item) &&
      c.tradeName === getTradeValue(item)
    );
    if (categoryMatch) return true;
  }

  if (subcategories.length > 0) {
    const subcategoryMatch = subcategories.some((sc) =>
      sc.name === getSubcategoryValue(item) &&
      sc.categoryName === getCategoryValue(item) &&
      sc.sectionName === getSectionValue(item) &&
      sc.tradeName === getTradeValue(item)
    );
    if (subcategoryMatch) return true;
  }

  if (types.length > 0) {
    const typeMatch = types.some((t) =>
      t.name === getTypeValue(item) &&
      t.subcategoryName === getSubcategoryValue(item) &&
      t.categoryName === getCategoryValue(item) &&
      t.sectionName === getSectionValue(item) &&
      t.tradeName === getTradeValue(item)
    );
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