// src/hooks/collections/collectionsScreen/useCollectionTabGroups.ts
import { useState, useCallback, useEffect } from 'react';
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
    const [productGrouping, setProductGrouping] = useState<Record<string, boolean>>({});
    const [laborGrouping, setLaborGrouping] = useState<Record<string, boolean>>({});
    const [toolGrouping, setToolGrouping] = useState<Record<string, boolean>>({});
    const [equipmentGrouping, setEquipmentGrouping] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (collection.tabGroupingPreferences) {
            setProductGrouping(collection.tabGroupingPreferences.products || {});
            setLaborGrouping(collection.tabGroupingPreferences.labor || {});
            setToolGrouping(collection.tabGroupingPreferences.tools || {});
            setEquipmentGrouping(collection.tabGroupingPreferences.equipment || {});
        }
    }, [collection.id, collection.tabGroupingPreferences]);

    const getCurrentGrouping = useCallback((contentType: CollectionContentType): Record<string, boolean> => {
        switch (contentType) {
            case 'products': return productGrouping;
            case 'labor': return laborGrouping;
            case 'tools': return toolGrouping;
            case 'equipment': return equipmentGrouping;
        }
    }, [productGrouping, laborGrouping, toolGrouping, equipmentGrouping]);

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

    const analyzeSections = useCallback((tabs: CategoryTab[]): Map<string, CategoryTab[]> => {
        const sectionMap = new Map<string, CategoryTab[]>();
        tabs.forEach(tab => {
            const sectionId = tab.section;
            if (!sectionMap.has(sectionId)) sectionMap.set(sectionId, []);
            sectionMap.get(sectionId)!.push(tab);
        });
        return sectionMap;
    }, []);

    /**
     * Returns groupable sections (2+ tabs in same section).
     * Accepts optional `localTabs` so unsaved/local tabs are included —
     * without this, newly added categories won't appear until after save.
     */
    const getGroupableSections = useCallback((
        contentType: CollectionContentType,
        localTabs?: CategoryTab[]
    ): SectionGroupState[] => {
        const tabs = localTabs ?? (
            contentType === 'products' ? collection.productCategoryTabs :
                contentType === 'labor' ? collection.laborCategoryTabs :
                    contentType === 'tools' ? collection.toolCategoryTabs :
                        collection.equipmentCategoryTabs
        );

        const sectionMap = analyzeSections(tabs || []);
        const grouping = getCurrentGrouping(contentType);
        const groupableList: SectionGroupState[] = [];

        sectionMap.forEach((sectionTabs, sectionId) => {
            if (sectionTabs.length >= 2) {
                groupableList.push({
                    sectionId,
                    sectionName: sectionTabs[0].section,
                    isCollapsed: grouping[sectionId] || false,
                    categoryTabIds: sectionTabs.map(t => t.id),
                    categoryCount: sectionTabs.length,
                });
            }
        });

        return groupableList;
    }, [collection, analyzeSections, getCurrentGrouping]);

    const canGroupSection = useCallback((sectionId: string, tabs: CategoryTab[]): boolean => {
        return tabs.filter(t => t.section === sectionId).length >= 2;
    }, []);

    const toggleSectionGroup = useCallback(async (
        contentType: CollectionContentType,
        sectionId: string
    ) => {
        const currentGrouping = getCurrentGrouping(contentType);
        const newGrouping = { ...currentGrouping, [sectionId]: !currentGrouping[sectionId] };

        setGroupingForType(contentType, newGrouping);

        const newPreferences: TabGroupingPreferences = {
            products: contentType === 'products' ? newGrouping : productGrouping,
            labor: contentType === 'labor' ? newGrouping : laborGrouping,
            tools: contentType === 'tools' ? newGrouping : toolGrouping,
            equipment: contentType === 'equipment' ? newGrouping : equipmentGrouping,
        };

        try {
            await onSave(newPreferences);
        } catch (error) {
            console.error('❌ [useCollectionTabGroups] Failed to save grouping', error);
            setGroupingForType(contentType, currentGrouping);
        }
    }, [getCurrentGrouping, setGroupingForType, productGrouping, laborGrouping, toolGrouping, equipmentGrouping, onSave]);

    const collapseAllSections = useCallback(async (
        contentType: CollectionContentType,
        localTabs?: CategoryTab[]
    ) => {
        const sections = getGroupableSections(contentType, localTabs);
        const newGrouping: Record<string, boolean> = {};
        sections.forEach(s => { newGrouping[s.sectionId] = true; });

        setGroupingForType(contentType, newGrouping);

        const newPreferences: TabGroupingPreferences = {
            products: contentType === 'products' ? newGrouping : productGrouping,
            labor: contentType === 'labor' ? newGrouping : laborGrouping,
            tools: contentType === 'tools' ? newGrouping : toolGrouping,
            equipment: contentType === 'equipment' ? newGrouping : equipmentGrouping,
        };

        try {
            await onSave(newPreferences);
        } catch (error) {
            console.error('❌ [useCollectionTabGroups] Failed to collapse all', error);
        }
    }, [getGroupableSections, setGroupingForType, productGrouping, laborGrouping, toolGrouping, equipmentGrouping, onSave]);

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
        } catch (error) {
            console.error('❌ [useCollectionTabGroups] Failed to expand all', error);
        }
    }, [setGroupingForType, productGrouping, laborGrouping, toolGrouping, equipmentGrouping, onSave]);

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
        return sectionTabs.filter(t => t.itemIds.length < 10).length >= 4;
    }, [collection]);

    return {
        productGrouping,
        laborGrouping,
        toolGrouping,
        equipmentGrouping,
        getCurrentGrouping,
        getGroupableSections,
        canGroupSection,
        toggleSectionGroup,
        collapseAllSections,
        expandAllSections,
        shouldSuggestGrouping,
    };
}