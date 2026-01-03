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
// Remove undefined values recursively
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) return null;
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
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
            productSelections: removeUndefinedValues(data.productSelections),
            laborCategoryTabs: data.laborCategoryTabs,
            laborSelections: removeUndefinedValues(data.laborSelections),
            toolCategoryTabs: data.toolCategoryTabs,
            toolSelections: removeUndefinedValues(data.toolSelections),
            equipmentCategoryTabs: data.equipmentCategoryTabs,
            equipmentSelections: removeUndefinedValues(data.equipmentSelections),
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