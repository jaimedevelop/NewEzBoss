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
    // Local tabs (user's current changes)
    const [localProductTabs, setLocalProductTabs] = useState(initialProductTabs);
    const [localLaborTabs, setLocalLaborTabs] = useState(initialLaborTabs);
    const [localToolTabs, setLocalToolTabs] = useState(initialToolTabs);
    const [localEquipmentTabs, setLocalEquipmentTabs] = useState(initialEquipmentTabs);

    // Saved tabs (last persisted to Firebase)
    const [savedProductTabs, setSavedProductTabs] = useState(initialProductTabs);
    const [savedLaborTabs, setSavedLaborTabs] = useState(initialLaborTabs);
    const [savedToolTabs, setSavedToolTabs] = useState(initialToolTabs);
    const [savedEquipmentTabs, setSavedEquipmentTabs] = useState(initialEquipmentTabs);

    // Get tabs for a specific content type
    const getLocalTabs = useCallback((contentType: CollectionContentType) => {
        switch (contentType) {
            case 'products': return localProductTabs;
            case 'labor': return localLaborTabs;
            case 'tools': return localToolTabs;
            case 'equipment': return localEquipmentTabs;
        }
    }, [localProductTabs, localLaborTabs, localToolTabs, localEquipmentTabs]);

    // Update local tabs
    const updateLocalTabs = useCallback((
        contentType: CollectionContentType,
        tabs: CategoryTab[]
    ) => {
        switch (contentType) {
            case 'products': setLocalProductTabs(tabs); break;
            case 'labor': setLocalLaborTabs(tabs); break;
            case 'tools': setLocalToolTabs(tabs); break;
            case 'equipment': setLocalEquipmentTabs(tabs); break;
        }
    }, []);

    // Mark tabs as saved
    const markTabsAsSaved = useCallback((contentType: CollectionContentType) => {
        switch (contentType) {
            case 'products':
                setSavedProductTabs(localProductTabs);
                break;
            case 'labor':
                setSavedLaborTabs(localLaborTabs);
                break;
            case 'tools':
                setSavedToolTabs(localToolTabs);
                break;
            case 'equipment':
                setSavedEquipmentTabs(localEquipmentTabs);
                break;
        }
    }, [localProductTabs, localLaborTabs, localToolTabs, localEquipmentTabs]);

    // Calculate unsaved changes per content type
    const hasUnsavedProductTabChanges = useMemo(() => {
        return JSON.stringify(localProductTabs) !== JSON.stringify(savedProductTabs);
    }, [localProductTabs, savedProductTabs]);

    const hasUnsavedLaborTabChanges = useMemo(() => {
        return JSON.stringify(localLaborTabs) !== JSON.stringify(savedLaborTabs);
    }, [localLaborTabs, savedLaborTabs]);

    const hasUnsavedToolTabChanges = useMemo(() => {
        return JSON.stringify(localToolTabs) !== JSON.stringify(savedToolTabs);
    }, [localToolTabs, savedToolTabs]);

    const hasUnsavedEquipmentTabChanges = useMemo(() => {
        return JSON.stringify(localEquipmentTabs) !== JSON.stringify(savedEquipmentTabs);
    }, [localEquipmentTabs, savedEquipmentTabs]);

    // Sync from prop changes (category add/remove)
    // Similar to useCollectionSelections - only sync local if no unsaved changes
    const syncFromProps = useCallback((
        contentType: CollectionContentType,
        propTabs: CategoryTab[],
        hasUnsavedChanges: boolean
    ) => {
        console.log('🔄 [useCollectionTabs] syncFromProps', {
            contentType,
            propTabsCount: propTabs.length,
            hasUnsavedChanges
        });

        // Always update saved tabs (source of truth from Firebase)
        switch (contentType) {
            case 'products':
                setSavedProductTabs(propTabs);
                // Only update local tabs if no unsaved changes
                if (!hasUnsavedChanges) {
                    setLocalProductTabs(propTabs);
                }
                break;
            case 'labor':
                setSavedLaborTabs(propTabs);
                if (!hasUnsavedChanges) {
                    setLocalLaborTabs(propTabs);
                }
                break;
            case 'tools':
                setSavedToolTabs(propTabs);
                if (!hasUnsavedChanges) {
                    setLocalToolTabs(propTabs);
                }
                break;
            case 'equipment':
                setSavedEquipmentTabs(propTabs);
                if (!hasUnsavedChanges) {
                    setLocalEquipmentTabs(propTabs);
                }
                break;
        }
    }, []);

    // Reset to initial state
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

    // NEW: Get visible tabs considering grouping state
    const getVisibleTabs = useCallback((
        contentType: CollectionContentType,
        groupingState: Record<string, boolean>
    ): (CategoryTab | { type: 'section', sectionId: string, sectionName: string, tabs: CategoryTab[] })[] => {
        const localTabs = getLocalTabs(contentType);

        // Group tabs by section
        const sectionMap = new Map<string, CategoryTab[]>();
        localTabs.forEach(tab => {
            const sectionId = tab.section;
            if (!sectionMap.has(sectionId)) {
                sectionMap.set(sectionId, []);
            }
            sectionMap.get(sectionId)!.push(tab);
        });

        const visibleTabs: any[] = [];

        sectionMap.forEach((tabs, sectionId) => {
            const isCollapsed = groupingState[sectionId] && tabs.length >= 2;

            if (isCollapsed) {
                // Return a virtual section tab
                visibleTabs.push({
                    type: 'section',
                    sectionId,
                    sectionName: tabs[0].section,
                    tabs,
                });
            } else {
                // Return individual category tabs
                visibleTabs.push(...tabs);
            }
        });

        return visibleTabs;
    }, [getLocalTabs]);

    return {
        // Local tabs
        localProductTabs,
        localLaborTabs,
        localToolTabs,
        localEquipmentTabs,

        // Saved tabs
        savedProductTabs,
        savedLaborTabs,
        savedToolTabs,
        savedEquipmentTabs,

        // Unsaved change flags
        hasUnsavedProductTabChanges,
        hasUnsavedLaborTabChanges,
        hasUnsavedToolTabChanges,
        hasUnsavedEquipmentTabChanges,

        // Methods
        getLocalTabs,
        updateLocalTabs,
        markTabsAsSaved,
        syncFromProps,
        resetAll,
        getVisibleTabs, // NEW
    };
}