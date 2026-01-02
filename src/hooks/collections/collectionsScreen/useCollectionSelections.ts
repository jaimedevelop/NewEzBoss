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
    // Live state (user's current changes)
    const [productSelections, setProductSelections] = useState(initialProductSelections);
    const [laborSelections, setLaborSelections] = useState(initialLaborSelections);
    const [toolSelections, setToolSelections] = useState(initialToolSelections);
    const [equipmentSelections, setEquipmentSelections] = useState(initialEquipmentSelections);

    // Saved state (last persisted to Firebase)
    const [savedProductSelections, setSavedProductSelections] = useState(initialProductSelections);
    const [savedLaborSelections, setSavedLaborSelections] = useState(initialLaborSelections);
    const [savedToolSelections, setSavedToolSelections] = useState(initialToolSelections);
    const [savedEquipmentSelections, setSavedEquipmentSelections] = useState(initialEquipmentSelections);

    // Calculate unsaved changes per content type
    const hasUnsavedProductChanges = useMemo(() => {
        return JSON.stringify(productSelections) !== JSON.stringify(savedProductSelections);
    }, [productSelections, savedProductSelections]);

    const hasUnsavedLaborChanges = useMemo(() => {
        return JSON.stringify(laborSelections) !== JSON.stringify(savedLaborSelections);
    }, [laborSelections, savedLaborSelections]);

    const hasUnsavedToolChanges = useMemo(() => {
        return JSON.stringify(toolSelections) !== JSON.stringify(savedToolSelections);
    }, [toolSelections, savedToolSelections]);

    const hasUnsavedEquipmentChanges = useMemo(() => {
        return JSON.stringify(equipmentSelections) !== JSON.stringify(savedEquipmentSelections);
    }, [equipmentSelections, savedEquipmentSelections]);

    // Get selections for a specific content type
    const getSelections = useCallback((contentType: CollectionContentType) => {
        switch (contentType) {
            case 'products': return productSelections;
            case 'labor': return laborSelections;
            case 'tools': return toolSelections;
            case 'equipment': return equipmentSelections;
        }
    }, [productSelections, laborSelections, toolSelections, equipmentSelections]);

    // Update selections for a specific content type
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

    // Mark selections as saved (after successful Firebase write)
    const markAsSaved = useCallback((contentType: CollectionContentType) => {
        switch (contentType) {
            case 'products':
                setSavedProductSelections(productSelections);
                break;
            case 'labor':
                setSavedLaborSelections(laborSelections);
                break;
            case 'tools':
                setSavedToolSelections(toolSelections);
                break;
            case 'equipment':
                setSavedEquipmentSelections(equipmentSelections);
                break;
        }
    }, [productSelections, laborSelections, toolSelections, equipmentSelections]);

    // Sync from Firebase (when subscription updates)
    const syncFromFirebase = useCallback((
        contentType: CollectionContentType,
        firebaseSelections: Record<string, ItemSelection>,
        hasUnsavedChanges: boolean
    ) => {
        // Always update saved state (source of truth)
        switch (contentType) {
            case 'products':
                setSavedProductSelections(firebaseSelections);
                // Only update live state if no unsaved changes
                if (!hasUnsavedChanges) {
                    setProductSelections(firebaseSelections);
                }
                break;
            case 'labor':
                setSavedLaborSelections(firebaseSelections);
                if (!hasUnsavedChanges) {
                    setLaborSelections(firebaseSelections);
                }
                break;
            case 'tools':
                setSavedToolSelections(firebaseSelections);
                if (!hasUnsavedChanges) {
                    setToolSelections(firebaseSelections);
                }
                break;
            case 'equipment':
                setSavedEquipmentSelections(firebaseSelections);
                if (!hasUnsavedChanges) {
                    setEquipmentSelections(firebaseSelections);
                }
                break;
        }
    }, []);

    // Reset to initial state (on collection change)
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
        // Live selections
        productSelections,
        laborSelections,
        toolSelections,
        equipmentSelections,

        // Saved selections
        savedProductSelections,
        savedLaborSelections,
        savedToolSelections,
        savedEquipmentSelections,

        // Unsaved change flags
        hasUnsavedProductChanges,
        hasUnsavedLaborChanges,
        hasUnsavedToolChanges,
        hasUnsavedEquipmentChanges,

        // Methods
        getSelections,
        updateSelections,
        markAsSaved,
        syncFromFirebase,
        resetAll,
    };
}