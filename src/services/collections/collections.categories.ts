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

    // Update category metadata
    updated.categorySelection = newCategorySelection;

    // Helper to merge tabs (replace existing with new data)
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

    // Merge tabs and selections based on content type
    switch (contentType) {
        case 'products':
            updated.productCategoryTabs = mergeTabs(updated.productCategoryTabs);
            updated.productSelections = {
                ...(updated.productSelections || {}),
                ...newSelections
            };
            break;
        case 'labor':
            updated.laborCategoryTabs = mergeTabs(updated.laborCategoryTabs);
            updated.laborSelections = {
                ...(updated.laborSelections || {}),
                ...newSelections
            };
            break;
        case 'tools':
            updated.toolCategoryTabs = mergeTabs(updated.toolCategoryTabs);
            updated.toolSelections = {
                ...(updated.toolSelections || {}),
                ...newSelections
            };
            break;
        case 'equipment':
            updated.equipmentCategoryTabs = mergeTabs(updated.equipmentCategoryTabs);
            updated.equipmentSelections = {
                ...(updated.equipmentSelections || {}),
                ...newSelections
            };
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

    console.log('🗑️ Removing category - TabId:', tabId, 'ContentType:', contentType);

    // Remove the tab
    const removeTab = (tabs: CategoryTab[] = []) =>
        tabs.filter(tab => tab.id !== tabId);

    // Remove associated selections
    const removeSelections = (selections: Record<string, ItemSelection> = {}) => {
        const filtered: Record<string, ItemSelection> = {};
        Object.entries(selections).forEach(([id, selection]) => {
            if (selection.categoryTabId !== tabId) {
                filtered[id] = selection;
            }
        });
        return filtered;
    };

    // Apply removal based on content type
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

    // ✅ Clean up categorySelection when tabs are removed
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
        // No tabs left - return empty structure
        return {
            trade: '',
            sections: [],
            categories: [],
            subcategories: [],
            types: [],
            description: ''
        };
    }

    // Extract all used sections, categories, subcategories from tabs
    const usedSections = new Set(allTabs.map(tab => tab.section).filter(Boolean));
    const usedCategories = new Set(allTabs.map(tab => tab.category).filter(Boolean));
    const usedSubcategories = new Set(
        allTabs.flatMap(tab => tab.subcategories || [])
    );

    // Filter categorySelection arrays
    const filterArray = (arr: any[], usedSet: Set<string>) => {
        return arr.filter(item => {
            if (typeof item === 'string') {
                return usedSet.has(item);
            }
            // Hierarchical item
            return usedSet.has(item.name);
        });
    };

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
 * Create tabs from CategorySelection when no items found
 * Returns array of CategoryTab objects with empty itemIds
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

    // Build tabs from categories
    (selection.categories || []).forEach((cat: any) => {
        const sectionName = typeof cat === 'string' ? '' : (cat.sectionName || '');
        const categoryName = typeof cat === 'string' ? cat : cat.name;
        const key = `${sectionName}-${categoryName}`;

        if (!tabMap.has(key)) {
            tabMap.set(key, {
                section: sectionName,
                category: categoryName,
                subcategories: new Set(),
            });
        }
    });

    // Add subcategories to tabs (and create parent tabs if needed)
    (selection.subcategories || []).forEach((sub: any) => {
        if (typeof sub === 'string') return;

        const key = `${sub.sectionName || ''}-${sub.categoryName || ''}`;

        // ✅ If parent tab doesn't exist, create it automatically
        if (!tabMap.has(key)) {
            tabMap.set(key, {
                section: sub.sectionName || '',
                category: sub.categoryName || '',
                subcategories: new Set(),
            });
        }

        // Add the subcategory to the tab
        tabMap.get(key)!.subcategories.add(sub.name);
    });

    // Convert to CategoryTab array
    return Array.from(tabMap.entries()).map(([key, data]) => ({
        id: key,
        type: contentType,
        name: data.category,
        section: data.section,
        category: data.category,
        subcategories: Array.from(data.subcategories),
        itemIds: [], // Empty - no items found
    }));
};