// src/hooks/collections/collectionsScreen/useCollectionSave.ts
import { useState, useCallback } from 'react';
import { saveCollectionChanges } from '../../../services/collections';
import type { CollectionContentType, CategoryTab, ItemSelection } from '../../../services/collections';

interface SaveData {
    collectionId: string;
    productCategoryTabs: CategoryTab[];
    productSelections: Record<string, ItemSelection>;
    laborCategoryTabs: CategoryTab[];
    laborSelections: Record<string, ItemSelection>;
    toolCategoryTabs: CategoryTab[];
    toolSelections: Record<string, ItemSelection>;
    equipmentCategoryTabs: CategoryTab[];
    equipmentSelections: Record<string, ItemSelection>;
    categorySelection: any;
}

export function useCollectionSave() {
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleSave = useCallback(async (
        data: SaveData,
        onSuccess: (contentType: CollectionContentType) => void,
        activeContentType: CollectionContentType
    ) => {
        setIsSaving(true);
        setSaveError(null);

        try {
            const cleanCategorySelection = {
                trade: data.categorySelection?.trade || '',
                sections: data.categorySelection?.sections || [],
                categories: data.categorySelection?.categories || [],
                subcategories: data.categorySelection?.subcategories || [],
                types: data.categorySelection?.types || [],
                description: data.categorySelection?.description || '',
            };

            const updates = {
                productCategoryTabs: data.productCategoryTabs,
                productSelections: data.productSelections,
                laborCategoryTabs: data.laborCategoryTabs,
                laborSelections: data.laborSelections,
                toolCategoryTabs: data.toolCategoryTabs,
                toolSelections: data.toolSelections,
                equipmentCategoryTabs: data.equipmentCategoryTabs,
                equipmentSelections: data.equipmentSelections,
                categorySelection: cleanCategorySelection,
            };

            const result = await saveCollectionChanges(data.collectionId, updates);

            if (!result.success) {
                throw new Error(result.error || 'Failed to save');
            }

            console.log('💾 Save successful!');
            onSuccess(activeContentType);

        } catch (error: any) {
            console.error('❌ Save error:', error);
            setSaveError(error.message || 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setSaveError(null);
    }, []);

    return {
        isSaving,
        saveError,
        handleSave,
        clearError,
    };
}