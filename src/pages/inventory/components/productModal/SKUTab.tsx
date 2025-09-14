import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../mainComponents/forms/HierarchicalSelect';
import { getStores, addStore } from '../../../../services/stores';
import { useAuthContext } from '../../../../contexts/AuthContext';

interface SKUEntry {
  id: string;
  store: string;
  sku: string;
}

interface ProductData {
  id?: string;
  name: string;
  sku: string;
  section: string;
  category: string;
  subcategory: string;
  type: 'Material' | 'Tool' | 'Equipment' | 'Rental' | 'Consumable' | 'Safety';
  size?: string;
  description: string;
  unitPrice: number;
  unit: string;
  onHand: number;
  assigned: number;
  available: number;
  minStock: number;
  maxStock: number;
  supplier: string;
  location: string;
  lastUpdated: string;
  skus?: SKUEntry[];
  barcode?: string;
}

interface SKUTabProps {
  formData: ProductData;
  onInputChange: (field: keyof ProductData, value: any) => void;
}

const SKUTab: React.FC<SKUTabProps> = ({ formData, onInputChange }) => {
  const { currentUser } = useAuthContext();
  const [storeOptions, setStoreOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Load stores when component mounts
  useEffect(() => {
    const loadStores = async () => {
      console.log('loadStores called, user:', currentUser);
      console.log('currentUser?.uid:', currentUser?.uid);
      
      if (!currentUser?.uid) {
        console.log('No user.uid, setting loading to false');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        console.log('Calling getStores with userId:', currentUser.uid);
        const result = await getStores(currentUser.uid);
        console.log('getStores result:', result);
        
        if (result.success && result.data) {
          const options = result.data.map(store => ({
            value: store.name,
            label: store.name
          }));
          console.log('Setting store options:', options);
          setStoreOptions(options);
        } else {
          console.log('getStores failed or no data');
          setStoreOptions([]);
        }
      } catch (error) {
        console.error('Error loading stores:', error);
        setStoreOptions([]);
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    loadStores();
  }, [currentUser?.uid]);

  const addSKU = () => {
    const newId = (Math.max(...(formData.skus || []).map(s => parseInt(s.id)), 0) + 1).toString();
    onInputChange('skus', [...(formData.skus || []), { id: newId, store: '', sku: '' }]);
  };

  const updateSKU = (id: string, field: 'store' | 'sku', value: string) => {
    const updatedSKUs = formData.skus?.map(sku => 
      sku.id === id ? { ...sku, [field]: value } : sku
    ) || [];
    onInputChange('skus', updatedSKUs);
  };

  const removeSKU = (id: string) => {
    const updatedSKUs = formData.skus?.filter(sku => sku.id !== id) || [];
    onInputChange('skus', updatedSKUs);
  };

  const handleAddNewStore = async (storeName: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await addStore(storeName, currentUser.uid);
      
      if (result.success) {
        // Add the new store to our local options
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

  if (loading) {
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
        <button
          type="button"
          onClick={addSKU}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add SKU
        </button>
      </div>

      <div className="space-y-3">
        {formData.skus?.map((sku, index) => (
          <div key={sku.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Store">
                <HierarchicalSelect
                  value={sku.store}
                  onChange={(value) => updateSKU(sku.id, 'store', value)}
                  options={storeOptions}
                  placeholder="Select store"
                  onAddNew={handleAddNewStore}
                />
              </FormField>
              <FormField label="SKU/Part Number">
                <InputField
                  value={sku.sku}
                  onChange={(e) => updateSKU(sku.id, 'sku', e.target.value)}
                  placeholder="Enter SKU or part number"
                />
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => removeSKU(sku.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )) || []}

        {(!formData.skus || formData.skus.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No SKUs added yet</div>
            <div className="text-xs mt-1">Click "Add SKU" to add store-specific part numbers</div>
          </div>
        )}
      </div>

      <FormField label="Barcode/Code Number">
        <InputField
          value={formData.barcode || ''}
          onChange={(e) => onInputChange('barcode', e.target.value)}
          placeholder="Enter barcode or internal code"
        />
      </FormField>
    </div>
  );
};

export default SKUTab;