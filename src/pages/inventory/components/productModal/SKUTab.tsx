import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import { SelectField } from '../../../../mainComponents/forms/SelectField';

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
  const storeOptions = [
    'Home Depot',
    'Lowes',
    'Hydrologic',
    'Ferguson',
    'Supply House',
    'Local Supplier',
    'Amazon',
    'Grainger',
    'Other'
  ];

  const addSKU = (store: string) => {
    const newId = (Math.max(...(formData.skus || []).map(s => parseInt(s.id)), 0) + 1).toString();
    onInputChange('skus', [...(formData.skus || []), { id: newId, store, sku: '' }]);
  };

  const updateSKU = (id: string, field: 'store' | 'sku', value: string) => {
    const updatedSKUs = formData.skus?.map(sku => 
      sku.id === id ? { ...sku, [field]: value } : sku
    ) || [];
    onInputChange('skus', updatedSKUs);
  };

  const removeSKU = (id: string) => {
    if (formData.skus && formData.skus.length > 1) {
      const updatedSKUs = formData.skus.filter(sku => sku.id !== id);
      onInputChange('skus', updatedSKUs);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">SKU Information</h3>
        <div className="flex flex-wrap gap-2">
          {storeOptions.map(store => (
            <button
              key={store}
              type="button"
              onClick={() => addSKU(store)}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add {store} SKU
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {formData.skus?.map((sku, index) => (
          <div key={sku.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Store">
                <SelectField
                  value={sku.store}
                  onChange={(e) => updateSKU(sku.id, 'store', e.target.value)}
                  options={[
                    { value: '', label: 'Select store' },
                    ...storeOptions.map(option => ({ value: option, label: option }))
                  ]}
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
            {formData.skus && formData.skus.length > 1 && (
              <button
                type="button"
                onClick={() => removeSKU(sku.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )) || []}
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