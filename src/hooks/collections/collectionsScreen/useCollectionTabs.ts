// src/hooks/collections/collectionsScreen/useCollectionTabs.ts
import { useState, useCallback, useMemo } from 'react';
import type { CategoryTab, CollectionContentType } from '../../../services/collections';

interface UseCollectionTabsProps {
    initialProductTabs: CategoryTab[];
    initialLaborTabs: CategoryTab[];
    initialToolTabs: CategoryTab[];
    initialEquipmentTabs: CategoryTab[];
}

export function useCollectionTabs({
    initialProductTabs,
    initialLaborTabs,
    initialToolTabs,
    initialEquipmentTabs,
}: UseCollectionTabsProps) {
    const [localProductTabs, setLocalProductTabs] = useState(initialProductTabs);
    const [localLaborTabs, setLocalLaborTabs] = useState(initialLaborTabs);
    const [localToolTabs, setLocalToolTabs] = useState(initialToolTabs);
    const [localEquipmentTabs, setLocalEquipmentTabs] = useState(initialEquipmentTabs);

    const [savedProductTabs, setSavedProductTabs] = useState(initialProductTabs);
    const [savedLaborTabs, setSavedLaborTabs] = useState(initialLaborTabs);
    const [savedToolTabs, setSavedToolTabs] = useState(initialToolTabs);
    const [savedEquipmentTabs, setSavedEquipmentTabs] = useState(initialEquipmentTabs);

    const getLocalTabs = useCallback((contentType: CollectionContentType) => {
        switch (contentType) {
            case 'products': return localProductTabs;
            case 'labor': return localLaborTabs;
            case 'tools': return localToolTabs;
            case 'equipment': return localEquipmentTabs;
        }
    }, [localProductTabs, localLaborTabs, localToolTabs, localEquipmentTabs]);

    const updateLocalTabs = useCallback((contentType: CollectionContentType, tabs: CategoryTab[]) => {
        switch (contentType) {
            case 'products': setLocalProductTabs(tabs); break;
            case 'labor': setLocalLaborTabs(tabs); break;
            case 'tools': setLocalToolTabs(tabs); break;
            case 'equipment': setLocalEquipmentTabs(tabs); break;
        }
    }, []);

    // Accepts explicit tabs to save — avoids stale closure when called immediately
    // after updateLocalTabs (setState is async, closed-over values won't be updated yet)
    const markTabsAsSaved = useCallback((
        contentType: CollectionContentType,
        tabsToSave?: CategoryTab[]
    ) => {
        switch (contentType) {
            case 'products':
                setSavedProductTabs(tabsToSave ?? localProductTabs);
                break;
            case 'labor':
                setSavedLaborTabs(tabsToSave ?? localLaborTabs);
                break;
            case 'tools':
                setSavedToolTabs(tabsToSave ?? localToolTabs);
                break;
            case 'equipment':
                setSavedEquipmentTabs(tabsToSave ?? localEquipmentTabs);
                break;
        }
    }, [localProductTabs, localLaborTabs, localToolTabs, localEquipmentTabs]);

    const hasUnsavedProductTabChanges = useMemo(() =>
        JSON.stringify(localProductTabs) !== JSON.stringify(savedProductTabs),
        [localProductTabs, savedProductTabs]);

    const hasUnsavedLaborTabChanges = useMemo(() =>
        JSON.stringify(localLaborTabs) !== JSON.stringify(savedLaborTabs),
        [localLaborTabs, savedLaborTabs]);

    const hasUnsavedToolTabChanges = useMemo(() =>
        JSON.stringify(localToolTabs) !== JSON.stringify(savedToolTabs),
        [localToolTabs, savedToolTabs]);

    const hasUnsavedEquipmentTabChanges = useMemo(() =>
        JSON.stringify(localEquipmentTabs) !== JSON.stringify(savedEquipmentTabs),
        [localEquipmentTabs, savedEquipmentTabs]);

    // Only syncs when there are no unsaved changes — does NOT touch saved tabs when dirty,
    // which prevents Firebase subscription from collapsing local/saved diff prematurely
    const syncFromProps = useCallback((
        contentType: CollectionContentType,
        propTabs: CategoryTab[],
        hasUnsavedChanges: boolean
    ) => {
        if (hasUnsavedChanges) return;
        switch (contentType) {
            case 'products':
                setLocalProductTabs(propTabs);
                setSavedProductTabs(propTabs);
                break;
            case 'labor':
                setLocalLaborTabs(propTabs);
                setSavedLaborTabs(propTabs);
                break;
            case 'tools':
                setLocalToolTabs(propTabs);
                setSavedToolTabs(propTabs);
                break;
            case 'equipment':
                setLocalEquipmentTabs(propTabs);
                setSavedEquipmentTabs(propTabs);
                break;
        }
    }, []);

    const resetAll = useCallback((
        newProductTabs: CategoryTab[],
        newLaborTabs: CategoryTab[],
        newToolTabs: CategoryTab[],
        newEquipmentTabs: CategoryTab[]
    ) => {
        setLocalProductTabs(newProductTabs);
        setSavedProductTabs(newProductTabs);
        setLocalLaborTabs(newLaborTabs);
        setSavedLaborTabs(newLaborTabs);
        setLocalToolTabs(newToolTabs);
        setSavedToolTabs(newToolTabs);
        setLocalEquipmentTabs(newEquipmentTabs);
        setSavedEquipmentTabs(newEquipmentTabs);
    }, []);

    const getVisibleTabs = useCallback((
        contentType: CollectionContentType,
        groupingState: Record<string, boolean>
    ): (CategoryTab | { type: 'section', sectionId: string, sectionName: string, tabs: CategoryTab[] })[] => {
        const localTabs = getLocalTabs(contentType);
        const sectionMap = new Map<string, CategoryTab[]>();

        localTabs.forEach(tab => {
            const sectionId = tab.section;
            if (!sectionMap.has(sectionId)) sectionMap.set(sectionId, []);
            sectionMap.get(sectionId)!.push(tab);
        });

        const visibleTabs: any[] = [];
        sectionMap.forEach((tabs, sectionId) => {
            if (groupingState[sectionId] && tabs.length >= 2) {
                visibleTabs.push({ type: 'section', sectionId, sectionName: tabs[0].section, tabs });
            } else {
                visibleTabs.push(...tabs);
            }
        });

        return visibleTabs;
    }, [getLocalTabs]);

    return {
        localProductTabs,
        localLaborTabs,
        localToolTabs,
        localEquipmentTabs,
        savedProductTabs,
        savedLaborTabs,
        savedToolTabs,
        savedEquipmentTabs,
        hasUnsavedProductTabChanges,
        hasUnsavedLaborTabChanges,
        hasUnsavedToolTabChanges,
        hasUnsavedEquipmentTabChanges,
        getLocalTabs,
        updateLocalTabs,
        markTabsAsSaved,
        syncFromProps,
        resetAll,
        getVisibleTabs,
    };
}