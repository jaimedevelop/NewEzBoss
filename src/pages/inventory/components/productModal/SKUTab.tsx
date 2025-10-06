import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../mainComponents/forms/HierarchicalSelect';
import { getStores, addStore } from '../../../../services/stores';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { useProductCreation } from '../../../../contexts/ProductCreationContext';

interface SKUTabProps {
  disabled?: boolean;
}

const SKUTab: React.FC<SKUTabProps> = ({ disabled = false }) => {
  const { currentUser } = useAuthContext();
  const { 
    state, 
    updateSKUEntry, 
    addSKUEntry, 
    removeSKUEntry
  } = useProductCreation();
  
  const { formData } = state;
  const [storeOptions, setStoreOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const storesLoaded = useRef(false);

  // Load stores only once
  useEffect(() => {
    if (!currentUser?.uid || storesLoaded.current) return;
    
    const loadStores = async () => {
      setIsLoadingStores(true);
      try {
        const result = await getStores(currentUser.uid!);
        
        if (result.success && result.data) {
          const options = result.data.map(store => ({
            value: store.name,
            label: store.name
          }));
          setStoreOptions(options);
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
        <h3 className="text-lg font-medium text-gray-900">SKU Information</h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading stores...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">SKU Information</h3>
        {!disabled && (
          <button
            type="button"
            onClick={addSKUEntry}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add SKU
          </button>
        )}
      </div>

      <div className="space-y-3">
        {formData.skus?.map((sku, index) => (
          <div key={sku.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <FormField label="SKU/Part Number">
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
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )) || []}

        {(!formData.skus || formData.skus.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No SKUs added yet</div>
            {!disabled && (
              <div className="text-xs mt-1">Click "Add SKU" to add store-specific part numbers</div>
            )}
          </div>
        )}
      </div>

      {/* Spacer to match PriceTab comparison box height - appears when there are SKUs */}
      {formData.skus && formData.skus.length > 0 && (
        <div className="bg-transparent p-4 rounded-lg">
          <div className="h-4 mb-3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-16"></div>
            <div className="h-16"></div>
            <div className="h-16"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SKUTab;