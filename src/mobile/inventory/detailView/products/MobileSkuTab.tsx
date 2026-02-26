// src/mobile/inventory/detailView/products/MobileSkuTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../mainComponents/forms/HierarchicalSelect';
import { getStores, addStore } from '../../../../services/inventory/products/stores';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { useProductCreation } from '../../../../contexts/ProductCreationContext';

interface MobileSkuTabProps {
    disabled?: boolean;
}

const MobileSkuTab: React.FC<MobileSkuTabProps> = ({ disabled = false }) => {
    const { currentUser } = useAuthContext();
    const { state, updateSKUEntry, addSKUEntry, removeSKUEntry } = useProductCreation();
    const { formData } = state;

    const [storeOptions, setStoreOptions] = useState<{ value: string; label: string }[]>([]);
    const [isLoadingStores, setIsLoadingStores] = useState(false);
    const storesLoaded = useRef(false);

    useEffect(() => {
        if (!currentUser?.uid || storesLoaded.current) return;

        const loadStores = async () => {
            setIsLoadingStores(true);
            try {
                const result = await getStores(currentUser.uid!);
                if (result.success && result.data) {
                    setStoreOptions(result.data.map(s => ({ value: s.name, label: s.name })));
                } else {
                    setStoreOptions([]);
                }
            } catch (error) {
                console.error('Error loading stores:', error);
                setStoreOptions([]);
            } finally {
                setIsLoadingStores(false);
                storesLoaded.current = true;
            }
        };

        loadStores();
    }, [currentUser?.uid]);

    const handleAddNewStore = async (storeName: string) => {
        if (!currentUser?.uid || disabled)
            return { success: false, error: 'User not authenticated' };

        try {
            const result = await addStore(storeName, currentUser.uid);
            if (result.success) {
                setStoreOptions(prev =>
                    [...prev, { value: storeName, label: storeName }].sort((a, b) =>
                        a.label.localeCompare(b.label)
                    )
                );
                return { success: true };
            }
            return { success: false, error: result.error || 'Failed to add store' };
        } catch (error) {
            console.error('Error adding new store:', error);
            return { success: false, error: 'Failed to add store' };
        }
    };

    if (isLoadingStores) {
        return (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                Loading stores...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 px-4 pb-6">
            {/* Header */}
            <div className="flex items-center justify-between pt-2">
                <h3 className="text-base font-semibold text-gray-900">SKU Information</h3>
                {!disabled && (
                    <button
                        type="button"
                        onClick={addSKUEntry}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 active:bg-gray-100 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add SKU
                    </button>
                )}
            </div>

            {/* SKU entries */}
            <div className="flex flex-col gap-3">
                {(formData.skus ?? []).map((sku) => (
                    <div
                        key={sku.id}
                        className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                    >
                        <div className="flex flex-col gap-3 p-3">
                            <FormField label="Store">
                                <HierarchicalSelect
                                    value={sku.store}
                                    onChange={(value) => !disabled && updateSKUEntry(sku.id, 'store', value)}
                                    options={storeOptions}
                                    placeholder="Select store"
                                    onAddNew={!disabled ? handleAddNewStore : undefined}
                                    disabled={disabled}
                                />
                            </FormField>
                            <FormField label="SKU / Part Number">
                                <InputField
                                    value={sku.sku}
                                    onChange={(e) => !disabled && updateSKUEntry(sku.id, 'sku', e.target.value)}
                                    placeholder="Enter SKU or part number"
                                    disabled={disabled}
                                />
                            </FormField>
                        </div>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => removeSKUEntry(sku.id)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-gray-100 text-sm text-red-600 active:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                Remove
                            </button>
                        )}
                    </div>
                ))}

                {(!formData.skus || formData.skus.length === 0) && (
                    <div className="text-center py-10 text-gray-400">
                        <p className="text-sm">No SKUs added yet</p>
                        {!disabled && (
                            <p className="text-xs mt-1">Tap "Add SKU" to add store-specific part numbers</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileSkuTab;