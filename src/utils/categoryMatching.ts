// src/utils/categoryMatching.ts
import type { CategorySelection } from '../services/collections';
import { HierarchicalCategoryItem } from '../services/collections/collections.types';

interface LegacyCategorySelection {
  trade?: string;
  sections: string[];
  categories: string[];
  subcategories: string[];
  types?: string[];
}

/**
 * Helper functions to normalize field access between content types.
 * Products use flat name fields; labor/tools/equipment use ID + cached name pairs.
 */
const getTradeId = (item: any): string => item.tradeId || '';
const getTradeName = (item: any): string => item.trade || item.tradeName || '';
const getSectionId = (item: any): string => item.sectionId || '';
const getSectionName = (item: any): string => item.section || item.sectionName || '';
const getCategoryId = (item: any): string => item.categoryId || '';
const getCategoryName = (item: any): string => item.category || item.categoryName || '';
const getSubcategoryId = (item: any): string => item.subcategoryId || '';
const getSubcategoryName = (item: any): string => item.subcategory || item.subcategoryName || '';
const getTypeName = (item: any): string => item.type || item.typeName || '';

/**
 * Match by ID if both sides have an ID, otherwise fall back to name.
 * If the target has no ID AND no name (both empty/undefined), skip the check —
 * this prevents an empty tradeName from failing every item match.
 */
const matchesIdOrName = (
  itemId: string,
  itemName: string,
  targetId: string | undefined,
  targetName: string
): boolean => {
  // If the selection has no meaningful constraint at this level, skip the check
  if (!targetId && !targetName) return true;
  if (itemId && targetId) return itemId === targetId;
  return itemName === targetName;
};

/**
 * Check if selection uses hierarchical structure (objects with tradeName/tradeId)
 */
const isHierarchicalStructure = (selection: CategorySelection): boolean => {
  const all = [
    ...selection.sections,
    ...selection.categories,
    ...selection.subcategories,
    ...(selection.types || [])
  ];
  if (all.length === 0) return true;
  return typeof all[0] === 'object';
};

/**
 * Match an item against a hierarchical category selection.
 * Uses ID-first matching with name fallback at every level.
 */
export const matchesHierarchicalSelection = (
  item: any,
  selection: CategorySelection
): boolean => {
  if (!isHierarchicalStructure(selection)) {
    return matchesLegacySelection(item, selection as any);
  }

  const sections = selection.sections as HierarchicalCategoryItem[];
  const categories = selection.categories as HierarchicalCategoryItem[];
  const subcategories = selection.subcategories as HierarchicalCategoryItem[];
  const types = (selection.types || []) as HierarchicalCategoryItem[];

  const hasAnySelection =
    sections.length > 0 ||
    categories.length > 0 ||
    subcategories.length > 0 ||
    types.length > 0;

  // Trade-only selection: match by tradeId or tradeName
  if (!hasAnySelection) {
    if (selection.tradeId) return getTradeId(item) === selection.tradeId;
    if (selection.trade) return getTradeName(item) === selection.trade;
    return true;
  }

  // Section-level match
  if (sections.length > 0) {
    const match = sections.some(s =>
      matchesIdOrName(getSectionId(item), getSectionName(item), s.sectionId, s.name) &&
      matchesIdOrName(getTradeId(item), getTradeName(item), s.tradeId, s.tradeName || '')
    );
    if (match) return true;
  }

  // Category-level match
  if (categories.length > 0) {
    const match = categories.some(c =>
      matchesIdOrName(getCategoryId(item), getCategoryName(item), c.categoryId, c.name) &&
      matchesIdOrName(getSectionId(item), getSectionName(item), c.sectionId, c.sectionName || '') &&
      matchesIdOrName(getTradeId(item), getTradeName(item), c.tradeId, c.tradeName || '')
    );
    if (match) return true;
  }

  // Subcategory-level match
  if (subcategories.length > 0) {
    const match = subcategories.some(sc =>
      matchesIdOrName(getSubcategoryId(item), getSubcategoryName(item), sc.subcategoryId, sc.name) &&
      matchesIdOrName(getCategoryId(item), getCategoryName(item), sc.categoryId, sc.categoryName || '') &&
      matchesIdOrName(getSectionId(item), getSectionName(item), sc.sectionId, sc.sectionName || '') &&
      matchesIdOrName(getTradeId(item), getTradeName(item), sc.tradeId, sc.tradeName || '')
    );
    if (match) return true;
  }

  // Type-level match (products only)
  if (types.length > 0) {
    const match = types.some(t =>
      getTypeName(item) === t.name &&
      matchesIdOrName(getSubcategoryId(item), getSubcategoryName(item), t.subcategoryId, t.subcategoryName || '') &&
      matchesIdOrName(getCategoryId(item), getCategoryName(item), t.categoryId, t.categoryName || '') &&
      matchesIdOrName(getSectionId(item), getSectionName(item), t.sectionId, t.sectionName || '') &&
      matchesIdOrName(getTradeId(item), getTradeName(item), t.tradeId, t.tradeName || '')
    );
    if (match) return true;
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
  if (selection.trade && getTradeName(item) !== selection.trade) return false;

  const sections = selection.sections as string[];
  const categories = selection.categories as string[];
  const subcategories = selection.subcategories as string[];
  const types = (selection.types || []) as string[];

  if (sections.length > 0 && !sections.includes(getSectionName(item))) return false;
  if (categories.length > 0 && !categories.includes(getCategoryName(item))) return false;
  if (subcategories.length > 0 && !subcategories.includes(getSubcategoryName(item))) return false;
  if (types.length > 0 && !types.includes(getTypeName(item))) return false;

  return true;
};