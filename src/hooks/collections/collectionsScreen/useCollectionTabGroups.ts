// src/hooks/collections/collectionsScreen/useCollectionTabGroups.ts
import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
    CategoryTab,
    CollectionContentType,
    Collection,
    TabGroupingPreferences
} from '../../../services/collections';

interface SectionGroupState {
    sectionId: string;
    sectionName: string;
    isCollapsed: boolean;
    categoryTabIds: string[];
    categoryCount: number;
}

interface UseCollectionTabGroupsProps {
    collection: Collection;
    onSave: (preferences: TabGroupingPreferences) => Promise<void>;
}

export function useCollectionTabGroups({
    collection,
    onSave,
}: UseCollectionTabGroupsProps) {
    // Grouping state per content type
    const [productGrouping, setProductGrouping] = useState<Record<string, boolean>>({});
    const [laborGrouping, setLaborGrouping] = useState<Record<string, boolean>>({});
    const [toolGrouping, setToolGrouping] = useState<Record<string, boolean>>({});
    const [equipmentGrouping, setEquipmentGrouping] = useState<Record<string, boolean>>({});

    // Load preferences from collection on mount/change
    useEffect(() => {
        if (collection.tabGroupingPreferences) {
            setProductGrouping(collection.tabGroupingPreferences.products || {});
            setLaborGrouping(collection.tabGroupingPreferences.labor || {});
            setToolGrouping(collection.tabGroupingPreferences.tools || {});
            setEquipmentGrouping(collection.tabGroupingPreferences.equipment || {});
        }
    }, [collection.id, collection.tabGroupingPreferences]);

    // Get current grouping for a content type
    const getCurrentGrouping = useCallback((contentType: CollectionContentType): Record<string, boolean> => {
        switch (contentType) {
            case 'products': return productGrouping;
            case 'labor': return laborGrouping;
            case 'tools': return toolGrouping;
            case 'equipment': return equipmentGrouping;
        }
    }, [productGrouping, laborGrouping, toolGrouping, equipmentGrouping]);

    // Update grouping for a specific content type
    const setGroupingForType = useCallback((
        contentType: CollectionContentType,
        grouping: Record<string, boolean>
    ) => {
        switch (contentType) {
            case 'products': setProductGrouping(grouping); break;
            case 'labor': setLaborGrouping(grouping); break;
            case 'tools': setToolGrouping(grouping); break;
            case 'equipment': setEquipmentGrouping(grouping); break;
        }
    }, []);

    // Analyze tabs to find groupable sections
    const analyzeSections = useCallback((tabs: CategoryTab[]): Map<string, CategoryTab[]> => {
        const sectionMap = new Map<string, CategoryTab[]>();

        tabs.forEach(tab => {
            const sectionId = tab.section;
            if (!sectionMap.has(sectionId)) {
                sectionMap.set(sectionId, []);
            }
            sectionMap.get(sectionId)!.push(tab);
        });

        return sectionMap;
    }, []);

    // Get groupable sections (2+ tabs in same section)
    const getGroupableSections = useCallback((contentType: CollectionContentType): SectionGroupState[] => {
        const tabs = contentType === 'products' ? collection.productCategoryTabs :
            contentType === 'labor' ? collection.laborCategoryTabs :
                contentType === 'tools' ? collection.toolCategoryTabs :
                    collection.equipmentCategoryTabs;

        const sectionMap = analyzeSections(tabs || []);
        const grouping = getCurrentGrouping(contentType);
        const groupableList: SectionGroupState[] = [];

        sectionMap.forEach((tabs, sectionId) => {
            if (tabs.length >= 2) {
                groupableList.push({
                    sectionId,
                    sectionName: tabs[0].section,
                    isCollapsed: grouping[sectionId] || false,
                    categoryTabIds: tabs.map(t => t.id),
                    categoryCount: tabs.length,
                });
            }
        });

        return groupableList;
    }, [collection, analyzeSections, getCurrentGrouping]);

    // Check if a section can be grouped
    const canGroupSection = useCallback((
        sectionId: string,
        tabs: CategoryTab[]
    ): boolean => {
        const sectionTabs = tabs.filter(t => t.section === sectionId);
        return sectionTabs.length >= 2;
    }, []);

    // Toggle section grouping
    const toggleSectionGroup = useCallback(async (
        contentType: CollectionContentType,
        sectionId: string
    ) => {
        const currentGrouping = getCurrentGrouping(contentType);
        const newGrouping = {
            ...currentGrouping,
            [sectionId]: !currentGrouping[sectionId],
        };

        setGroupingForType(contentType, newGrouping);

        // Save to Firestore (debounced via timeout)
        const newPreferences: TabGroupingPreferences = {
            products: contentType === 'products' ? newGrouping : productGrouping,
            labor: contentType === 'labor' ? newGrouping : laborGrouping,
            tools: contentType === 'tools' ? newGrouping : toolGrouping,
            equipment: contentType === 'equipment' ? newGrouping : equipmentGrouping,
        };

        try {
            await onSave(newPreferences);
            console.log('✅ [useCollectionTabGroups] Saved grouping preferences', {
                contentType,
                sectionId,
                isCollapsed: newGrouping[sectionId]
            });
        } catch (error) {
            console.error('❌ [useCollectionTabGroups] Failed to save grouping', error);
            // Revert on error
            setGroupingForType(contentType, currentGrouping);
        }
    }, [
        getCurrentGrouping,
        setGroupingForType,
        productGrouping,
        laborGrouping,
        toolGrouping,
        equipmentGrouping,
        onSave
    ]);

    // Collapse all sections for a content type
    const collapseAllSections = useCallback(async (contentType: CollectionContentType) => {
        const sections = getGroupableSections(contentType);
        const newGrouping: Record<string, boolean> = {};

        sections.forEach(section => {
            newGrouping[section.sectionId] = true;
        });

        setGroupingForType(contentType, newGrouping);

        const newPreferences: TabGroupingPreferences = {
            products: contentType === 'products' ? newGrouping : productGrouping,
            labor: contentType === 'labor' ? newGrouping : laborGrouping,
            tools: contentType === 'tools' ? newGrouping : toolGrouping,
            equipment: contentType === 'equipment' ? newGrouping : equipmentGrouping,
        };

        try {
            await onSave(newPreferences);
            console.log('✅ [useCollectionTabGroups] Collapsed all sections', { contentType });
        } catch (error) {
            console.error('❌ [useCollectionTabGroups] Failed to collapse all', error);
        }
    }, [getGroupableSections, setGroupingForType, productGrouping, laborGrouping, toolGrouping, equipmentGrouping, onSave]);

    // Expand all sections for a content type
    const expandAllSections = useCallback(async (contentType: CollectionContentType) => {
        const newGrouping: Record<string, boolean> = {};

        setGroupingForType(contentType, newGrouping);

        const newPreferences: TabGroupingPreferences = {
            products: contentType === 'products' ? newGrouping : productGrouping,
            labor: contentType === 'labor' ? newGrouping : laborGrouping,
            tools: contentType === 'tools' ? newGrouping : toolGrouping,
            equipment: contentType === 'equipment' ? newGrouping : equipmentGrouping,
        };

        try {
            await onSave(newPreferences);
            console.log('✅ [useCollectionTabGroups] Expanded all sections', { contentType });
        } catch (error) {
            console.error('❌ [useCollectionTabGroups] Failed to expand all', error);
        }
    }, [setGroupingForType, productGrouping, laborGrouping, toolGrouping, equipmentGrouping, onSave]);

    // Check if should suggest grouping (4+ sparse categories)
    const shouldSuggestGrouping = useCallback((
        contentType: CollectionContentType,
        sectionId: string
    ): boolean => {
        const tabs = contentType === 'products' ? collection.productCategoryTabs :
            contentType === 'labor' ? collection.laborCategoryTabs :
                contentType === 'tools' ? collection.toolCategoryTabs :
                    collection.equipmentCategoryTabs;

        const sectionTabs = (tabs || []).filter(t => t.section === sectionId);

        if (sectionTabs.length < 4) return false;

        // Check if categories are "sparse" (< 10 items each)
        const sparseTabs = sectionTabs.filter(t => t.itemIds.length < 10);
        return sparseTabs.length >= 4;
    }, [collection]);

    return {
        // Current grouping state
        productGrouping,
        laborGrouping,
        toolGrouping,
        equipmentGrouping,

        // Methods
        getCurrentGrouping,
        getGroupableSections,
        canGroupSection,
        toggleSectionGroup,
        collapseAllSections,
        expandAllSections,
        shouldSuggestGrouping,
    };
}