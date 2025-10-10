// src/pages/inventory/components/PriceTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../../mainComponents/forms/HierarchicalSelect';
import { getStores, addStore } from '../../../../../services/stores';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { useProductCreation } from '../../../../../contexts/ProductCreationContext';

interface PriceTabProps {
  disabled?: boolean;
}

const PriceTab: React.FC<PriceTabProps> = ({ disabled = false }) => {
  const { currentUser } = useAuthContext();
  const { 
    state, 
    updatePriceEntry, 
    addPriceEntry, 
    removePriceEntry
  } = useProductCreation();
  
  const { formData } = state;
  const [storeOptions, setStoreOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const storesLoaded = useRef(false);

  // Calculate price comparison dynamically
  const priceComparison = React.useMemo(() => {
    if (!formData.priceEntries || formData.priceEntries.length === 0) {
      return { lowestPrice: null, highestPrice: null, averagePrice: 0 };
    }

    const validPrices = formData.priceEntries.filter(p => p.store && p.price);
    if (validPrices.length === 0) {
      return { lowestPrice: null, highestPrice: null, averagePrice: 0 };
    }

    const numericPrices = validPrices.map(p => parseFloat(p.price));
    const lowestIdx = numericPrices.indexOf(Math.min(...numericPrices));
    const highestIdx = numericPrices.indexOf(Math.max(...numericPrices));
    
    return {
      lowestPrice: validPrices[lowestIdx] ? {
        store: validPrices[lowestIdx].store,
        price: numericPrices[lowestIdx]
      } : null,
      highestPrice: validPrices[highestIdx] ? {
        store: validPrices[highestIdx].store,
        price: numericPrices[highestIdx]
      } : null,
      averagePrice: numericPrices.reduce((a, b) => a + b, 0) / numericPrices.length
    };
  }, [formData.priceEntries]);

  // Load stores only once
  useEffect(() => {
    if (!currentUser?.uid || storesLoaded.current) return;
    
    const loadStores = async () => {
      setIsLoadingStores(true);
      try {
        const storesResult = await getStores(currentUser.uid!);
        if (storesResult.success && storesResult.data) {
          const options = storesResult.data.map(store => ({
            value: store.name,
            label: store.name
          }));
          setStoreOptions(options);
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

  const handleRemovePrice = (id: string) => {
    if (disabled) return;
    removePriceEntry(id);
  };

  const handleAddNewStore = async (storeName: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await addStore(storeName, currentUser.uid);
      
      if (result.success) {
        const newOption = { value: storeName, label: storeName };
        setStoreOptions(prev => [...prev, newOption].sort((a, b) => a.label.localeCompare(b.label)));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to add store' };
      }
    } catch (error) {
      console.error('Error adding new store:', error);
      return { success: false, error: 'Failed to add store' };
    }
  };

  if (isLoadingStores) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Price Information</h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading pricing data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Price Information</h3>
        {!disabled && (
          <button
            type="button"
            onClick={addPriceEntry}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Price
          </button>
        )}
      </div>

      {/* Store-specific prices */}
      <div className="space-y-3">
        {formData.priceEntries.map((entry) => (
          <div key={entry.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Store/Supplier">
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
                onClick={() => handleRemovePrice(entry.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {formData.priceEntries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No store prices added yet</div>
            {!disabled && (
              <div className="text-xs mt-1">Click "Add Price" to add store-specific pricing</div>
            )}
          </div>
        )}
      </div>

      {/* Price comparison summary */}
      {formData.priceEntries.length > 1 && priceComparison.lowestPrice && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Price Comparison</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <TrendingDown className="w-4 h-4 text-green-600 mr-2" />
              <div>
                <span className="text-gray-500">Lowest:</span>
                <div className="font-medium text-green-600">
                  ${priceComparison.lowestPrice.price.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">
                  {priceComparison.lowestPrice.store}
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 text-red-600 mr-2" />
              <div>
                <span className="text-gray-500">Highest:</span>
                <div className="font-medium text-red-600">
                  ${priceComparison.highestPrice.price.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">
                  {priceComparison.highestPrice.store}
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
              <div>
                <span className="text-gray-500">Average:</span>
                <div className="font-medium text-blue-600">
                  ${priceComparison.averagePrice.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">
                  Across {formData.priceEntries.filter(p => p.store && p.price).length} stores
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceTab;