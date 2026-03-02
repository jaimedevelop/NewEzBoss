// src/services/collections/collections.categories.ts
import {
    Collection,
    CategoryTab,
    ItemSelection,
    CollectionContentType,
} from './collections.types';

/**
 * Pure function to add categories to a collection
 * Returns NEW collection object (immutable)
 */
export const addCategoryToCollection = (
    collection: Collection,
    newTabs: CategoryTab[],
    newSelections: Record<string, ItemSelection>,
    newCategorySelection: any,
    contentType: CollectionContentType
): Collection => {
    const updated = { ...collection };

    updated.categorySelection = newCategorySelection;

    const mergeTabs = (currentTabs: CategoryTab[] = []) => {
        const merged: CategoryTab[] = [];
        const processedKeys = new Set<string>();

        newTabs.forEach(newTab => {
            const key = `${newTab.section}-${newTab.category}`;
            const existingTab = currentTabs.find(t => `${t.section}-${t.category}` === key);

            if (existingTab) {
                merged.push({
                    ...existingTab,
                    subcategories: Array.from(new Set([...existingTab.subcategories, ...newTab.subcategories])),
                    itemIds: Array.from(new Set([...existingTab.itemIds, ...newTab.itemIds])),
                });
            } else {
                merged.push(newTab);
            }
            processedKeys.add(key);
        });

        currentTabs.forEach(currentTab => {
            const key = `${currentTab.section}-${currentTab.category}`;
            if (!processedKeys.has(key)) {
                merged.push(currentTab);
            }
        });

        return merged;
    };

    switch (contentType) {
        case 'products':
            updated.productCategoryTabs = mergeTabs(updated.productCategoryTabs);
            updated.productSelections = { ...(updated.productSelections || {}), ...newSelections };
            break;
        case 'labor':
            updated.laborCategoryTabs = mergeTabs(updated.laborCategoryTabs);
            updated.laborSelections = { ...(updated.laborSelections || {}), ...newSelections };
            break;
        case 'tools':
            updated.toolCategoryTabs = mergeTabs(updated.toolCategoryTabs);
            updated.toolSelections = { ...(updated.toolSelections || {}), ...newSelections };
            break;
        case 'equipment':
            updated.equipmentCategoryTabs = mergeTabs(updated.equipmentCategoryTabs);
            updated.equipmentSelections = { ...(updated.equipmentSelections || {}), ...newSelections };
            break;
    }

    return updated;
};

/**
 * Pure function to remove a category from a collection
 * Returns NEW collection object (immutable)
 */
export const removeCategoryFromCollection = (
    collection: Collection,
    tabId: string,
    contentType: CollectionContentType
): Collection => {
    const updated = { ...collection };

    const removeTab = (tabs: CategoryTab[] = []) =>
        tabs.filter(tab => tab.id !== tabId);

    const removeSelections = (selections: Record<string, ItemSelection> = {}) => {
        const filtered: Record<string, ItemSelection> = {};
        Object.entries(selections).forEach(([id, selection]) => {
            if (selection.categoryTabId !== tabId) {
                filtered[id] = selection;
            }
        });
        return filtered;
    };

    switch (contentType) {
        case 'products':
            updated.productCategoryTabs = removeTab(updated.productCategoryTabs);
            updated.productSelections = removeSelections(updated.productSelections);
            break;
        case 'labor':
            updated.laborCategoryTabs = removeTab(updated.laborCategoryTabs);
            updated.laborSelections = removeSelections(updated.laborSelections);
            break;
        case 'tools':
            updated.toolCategoryTabs = removeTab(updated.toolCategoryTabs);
            updated.toolSelections = removeSelections(updated.toolSelections);
            break;
        case 'equipment':
            updated.equipmentCategoryTabs = removeTab(updated.equipmentCategoryTabs);
            updated.equipmentSelections = removeSelections(updated.equipmentSelections);
            break;
    }

    updated.categorySelection = cleanCategorySelection(
        updated.categorySelection || {},
        updated.productCategoryTabs || [],
        updated.laborCategoryTabs || [],
        updated.toolCategoryTabs || [],
        updated.equipmentCategoryTabs || []
    );

    return updated;
};

/**
 * Clean up unused category metadata when tabs are removed
 */
const cleanCategorySelection = (
    categorySelection: any,
    productTabs: CategoryTab[],
    laborTabs: CategoryTab[],
    toolTabs: CategoryTab[],
    equipmentTabs: CategoryTab[]
): any => {
    const allTabs = [...productTabs, ...laborTabs, ...toolTabs, ...equipmentTabs];

    if (allTabs.length === 0) {
        return { trade: '', sections: [], categories: [], subcategories: [], types: [], description: '' };
    }

    const usedSections = new Set(allTabs.map(tab => tab.section).filter(Boolean));
    const usedCategories = new Set(allTabs.map(tab => tab.category).filter(Boolean));
    const usedSubcategories = new Set(allTabs.flatMap(tab => tab.subcategories || []));

    const filterArray = (arr: any[], usedSet: Set<string>) =>
        arr.filter(item => usedSet.has(typeof item === 'string' ? item : item.name));

    return {
        trade: categorySelection.trade || '',
        sections: filterArray(categorySelection.sections || [], usedSections),
        categories: filterArray(categorySelection.categories || [], usedCategories),
        subcategories: filterArray(categorySelection.subcategories || [], usedSubcategories),
        types: categorySelection.types || [],
        description: categorySelection.description || ''
    };
};

/**
 * Create tabs from a CategorySelection when no items are found, or as the
 * structural skeleton that gets populated with itemIds in useCategoryManagement.
 *
 * Handles all selection levels: sections, categories, subcategories.
 * Section-level selections produce one tab per section (category name = section name)
 * so items fetched by section always have a tab to land in. The grouping functions
 * in useCategoryManagement will then replace these with properly grouped tabs
 * derived from the actual items.
 */
export const createTabsFromSelection = (
    selection: any,
    contentType: CollectionContentType
): CategoryTab[] => {
    const tabMap = new Map<string, {
        section: string;
        category: string;
        subcategories: Set<string>;
    }>();

    // Section-level selections: create one placeholder tab per section.
    // The section name doubles as the category name so the tab has a display label.
    (selection.sections || []).forEach((sec: any) => {
        const sectionName = typeof sec === 'string' ? sec : (sec.name || '');
        const tradeName = typeof sec === 'string' ? '' : (sec.tradeName || '');
        if (!sectionName) return;

        // Key includes tradeName to avoid collisions across trades
        const key = `${tradeName}-${sectionName}-__section__`;
        if (!tabMap.has(key)) {
            tabMap.set(key, {
                section: sectionName,
                category: sectionName, // placeholder — will be split into real tabs by grouping fns
                subcategories: new Set(),
            });
        }
    });

    // Category-level selections
    (selection.categories || []).forEach((cat: any) => {
        const sectionName = typeof cat === 'string' ? '' : (cat.sectionName || '');
        const categoryName = typeof cat === 'string' ? cat : cat.name;
        if (!categoryName) return;

        const key = `${sectionName}-${categoryName}`;
        if (!tabMap.has(key)) {
            tabMap.set(key, { section: sectionName, category: categoryName, subcategories: new Set() });
        }
    });

    // Subcategory-level selections: create parent tab if needed
    (selection.subcategories || []).forEach((sub: any) => {
        if (typeof sub === 'string') return;

        const key = `${sub.sectionName || ''}-${sub.categoryName || ''}`;
        if (!tabMap.has(key)) {
            tabMap.set(key, {
                section: sub.sectionName || '',
                category: sub.categoryName || '',
                subcategories: new Set(),
            });
        }
        if (sub.name) tabMap.get(key)!.subcategories.add(sub.name);
    });

    return Array.from(tabMap.entries()).map(([key, data]) => ({
        id: key,
        type: contentType,
        name: data.category,
        section: data.section,
        category: data.category,
        subcategories: Array.from(data.subcategories),
        itemIds: [],
    }));
};