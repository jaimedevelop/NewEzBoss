// src/hooks/collections/collectionsScreen/useCollectionSelections.ts
import { useState, useCallback, useMemo } from 'react';
import type { ItemSelection, CollectionContentType } from '../../../services/collections';

interface UseCollectionSelectionsProps {
    initialProductSelections: Record<string, ItemSelection>;
    initialLaborSelections: Record<string, ItemSelection>;
    initialToolSelections: Record<string, ItemSelection>;
    initialEquipmentSelections: Record<string, ItemSelection>;
}

export function useCollectionSelections({
    initialProductSelections,
    initialLaborSelections,
    initialToolSelections,
    initialEquipmentSelections,
}: UseCollectionSelectionsProps) {
    const [productSelections, setProductSelections] = useState(initialProductSelections);
    const [laborSelections, setLaborSelections] = useState(initialLaborSelections);
    const [toolSelections, setToolSelections] = useState(initialToolSelections);
    const [equipmentSelections, setEquipmentSelections] = useState(initialEquipmentSelections);

    const [savedProductSelections, setSavedProductSelections] = useState(initialProductSelections);
    const [savedLaborSelections, setSavedLaborSelections] = useState(initialLaborSelections);
    const [savedToolSelections, setSavedToolSelections] = useState(initialToolSelections);
    const [savedEquipmentSelections, setSavedEquipmentSelections] = useState(initialEquipmentSelections);

    const hasUnsavedProductChanges = useMemo(() =>
        JSON.stringify(productSelections) !== JSON.stringify(savedProductSelections),
        [productSelections, savedProductSelections]);

    const hasUnsavedLaborChanges = useMemo(() =>
        JSON.stringify(laborSelections) !== JSON.stringify(savedLaborSelections),
        [laborSelections, savedLaborSelections]);

    const hasUnsavedToolChanges = useMemo(() =>
        JSON.stringify(toolSelections) !== JSON.stringify(savedToolSelections),
        [toolSelections, savedToolSelections]);

    const hasUnsavedEquipmentChanges = useMemo(() =>
        JSON.stringify(equipmentSelections) !== JSON.stringify(savedEquipmentSelections),
        [equipmentSelections, savedEquipmentSelections]);

    const getSelections = useCallback((contentType: CollectionContentType) => {
        switch (contentType) {
            case 'products': return productSelections;
            case 'labor': return laborSelections;
            case 'tools': return toolSelections;
            case 'equipment': return equipmentSelections;
        }
    }, [productSelections, laborSelections, toolSelections, equipmentSelections]);

    const updateSelections = useCallback((
        contentType: CollectionContentType,
        updater: (prev: Record<string, ItemSelection>) => Record<string, ItemSelection>
    ) => {
        switch (contentType) {
            case 'products': setProductSelections(updater); break;
            case 'labor': setLaborSelections(updater); break;
            case 'tools': setToolSelections(updater); break;
            case 'equipment': setEquipmentSelections(updater); break;
        }
    }, []);

    // Accepts explicit selections to save — avoids stale closure when called immediately
    // after updateSelections (setState is async, closed-over values won't be updated yet)
    const markAsSaved = useCallback((
        contentType: CollectionContentType,
        selectionsToSave?: Record<string, ItemSelection>
    ) => {
        switch (contentType) {
            case 'products':
                setSavedProductSelections(selectionsToSave ?? productSelections);
                break;
            case 'labor':
                setSavedLaborSelections(selectionsToSave ?? laborSelections);
                break;
            case 'tools':
                setSavedToolSelections(selectionsToSave ?? toolSelections);
                break;
            case 'equipment':
                setSavedEquipmentSelections(selectionsToSave ?? equipmentSelections);
                break;
        }
    }, [productSelections, laborSelections, toolSelections, equipmentSelections]);

    // Only syncs when there are no unsaved changes — does NOT touch saved selections when dirty,
    // which prevents Firebase subscription from collapsing local/saved diff prematurely
    const syncFromFirebase = useCallback((
        contentType: CollectionContentType,
        firebaseSelections: Record<string, ItemSelection>,
        hasUnsavedChanges: boolean
    ) => {
        if (hasUnsavedChanges) return;
        switch (contentType) {
            case 'products':
                setProductSelections(firebaseSelections);
                setSavedProductSelections(firebaseSelections);
                break;
            case 'labor':
                setLaborSelections(firebaseSelections);
                setSavedLaborSelections(firebaseSelections);
                break;
            case 'tools':
                setToolSelections(firebaseSelections);
                setSavedToolSelections(firebaseSelections);
                break;
            case 'equipment':
                setEquipmentSelections(firebaseSelections);
                setSavedEquipmentSelections(firebaseSelections);
                break;
        }
    }, []);

    const resetAll = useCallback((
        newProductSelections: Record<string, ItemSelection>,
        newLaborSelections: Record<string, ItemSelection>,
        newToolSelections: Record<string, ItemSelection>,
        newEquipmentSelections: Record<string, ItemSelection>
    ) => {
        setProductSelections(newProductSelections);
        setSavedProductSelections(newProductSelections);
        setLaborSelections(newLaborSelections);
        setSavedLaborSelections(newLaborSelections);
        setToolSelections(newToolSelections);
        setSavedToolSelections(newToolSelections);
        setEquipmentSelections(newEquipmentSelections);
        setSavedEquipmentSelections(newEquipmentSelections);
    }, []);

    return {
        productSelections,
        laborSelections,
        toolSelections,
        equipmentSelections,
        savedProductSelections,
        savedLaborSelections,
        savedToolSelections,
        savedEquipmentSelections,
        hasUnsavedProductChanges,
        hasUnsavedLaborChanges,
        hasUnsavedToolChanges,
        hasUnsavedEquipmentChanges,
        getSelections,
        updateSelections,
        markAsSaved,
        syncFromFirebase,
        resetAll,
    };
}