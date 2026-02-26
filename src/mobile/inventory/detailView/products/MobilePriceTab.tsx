// src/mobile/inventory/detailView/products/MobilePriceTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../mainComponents/forms/HierarchicalSelect';
import { getStores, addStore } from '../../../../services/inventory/products/stores';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { useProductCreation } from '../../../../contexts/ProductCreationContext';

interface MobilePriceTabProps {
    disabled?: boolean;
}

const MobilePriceTab: React.FC<MobilePriceTabProps> = ({ disabled = false }) => {
    const { currentUser } = useAuthContext();
    const { state, updatePriceEntry, addPriceEntry, removePriceEntry } = useProductCreation();
    const { formData } = state;

    const [storeOptions, setStoreOptions] = useState<{ value: string; label: string }[]>([]);
    const [isLoadingStores, setIsLoadingStores] = useState(false);
    const storesLoaded = useRef(false);

    const priceComparison = React.useMemo(() => {
        if (!formData.priceEntries || formData.priceEntries.length === 0)
            return { lowestPrice: null, highestPrice: null, averagePrice: 0 };

        const validPrices = formData.priceEntries.filter(p => p.store && p.price);
        if (validPrices.length === 0)
            return { lowestPrice: null, highestPrice: null, averagePrice: 0 };

        const numericPrices = validPrices.map(p => parseFloat(p.price));
        const lowestIdx = numericPrices.indexOf(Math.min(...numericPrices));
        const highestIdx = numericPrices.indexOf(Math.max(...numericPrices));

        return {
            lowestPrice: validPrices[lowestIdx]
                ? { store: validPrices[lowestIdx].store, price: numericPrices[lowestIdx] }
                : null,
            highestPrice: validPrices[highestIdx]
                ? { store: validPrices[highestIdx].store, price: numericPrices[highestIdx] }
                : null,
            averagePrice: numericPrices.reduce((a, b) => a + b, 0) / numericPrices.length,
            validCount: validPrices.length,
        };
    }, [formData.priceEntries]);

    useEffect(() => {
        if (!currentUser?.uid || storesLoaded.current) return;

        const loadStores = async () => {
            setIsLoadingStores(true);
            try {
                const result = await getStores(currentUser.uid!);
                if (result.success && result.data) {
                    setStoreOptions(result.data.map(s => ({ value: s.name, label: s.name })));
                }
            } catch (error) {
                console.error('Error loading stores:', error);
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
                Loading pricing data...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 px-4 pb-6">
            {/* Header */}
            <div className="flex items-center justify-between pt-2">
                <h3 className="text-base font-semibold text-gray-900">Price Information</h3>
                {!disabled && (
                    <button
                        type="button"
                        onClick={addPriceEntry}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 active:bg-gray-100 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Price
                    </button>
                )}
            </div>

            {/* Price entries */}
            <div className="flex flex-col gap-3">
                {formData.priceEntries.map((entry) => (
                    <div
                        key={entry.id}
                        className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                    >
                        <div className="flex flex-col gap-3 p-3">
                            <FormField label="Store / Supplier">
                                <HierarchicalSelect
                                    value={entry.store}
                                    onChange={(value) => !disabled && updatePriceEntry(entry.id, 'store', value)}
                                    options={storeOptions}
                                    placeholder="Select store"
                                    onAddNew={!disabled ? handleAddNewStore : undefined}
                                    disabled={disabled}
                                />
                            </FormField>
                            <FormField label="Price">
                                <InputField
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={entry.price}
                                    onChange={(e) => !disabled && updatePriceEntry(entry.id, 'price', e.target.value)}
                                    placeholder="0.00"
                                    disabled={disabled}
                                />
                            </FormField>
                        </div>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => removePriceEntry(entry.id)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-gray-100 text-sm text-red-600 active:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                Remove
                            </button>
                        )}
                    </div>
                ))}

                {formData.priceEntries.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                        <p className="text-sm">No store prices added yet</p>
                        {!disabled && (
                            <p className="text-xs mt-1">Tap "Add Price" to add store-specific pricing</p>
                        )}
                    </div>
                )}
            </div>

            {/* Price comparison */}
            {formData.priceEntries.length > 1 && priceComparison.lowestPrice && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Price Comparison
                    </h4>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <TrendingDown className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-gray-500">Lowest</span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-semibold text-green-600">
                                    ${priceComparison.lowestPrice.price.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-400">{priceComparison.lowestPrice.store}</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-red-600" />
                                <span className="text-sm text-gray-500">Highest</span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-semibold text-red-600">
                                    ${priceComparison.highestPrice.price.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-400">{priceComparison.highestPrice.store}</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-blue-600 flex-shrink-0" />
                                <span className="text-sm text-gray-500">Average</span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-semibold text-blue-600">
                                    ${priceComparison.averagePrice.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-400">
                                    Across {priceComparison.validCount} stores
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobilePriceTab;