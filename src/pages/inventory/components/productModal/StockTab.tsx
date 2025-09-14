import React from 'react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import { SelectField } from '../../../../mainComponents/forms/SelectField';

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
  skus?: any[];
  barcode?: string;
}

interface StockTabProps {
  formData: ProductData;
  onInputChange: (field: keyof ProductData, value: any) => void;
}

const StockTab: React.FC<StockTabProps> = ({ formData, onInputChange }) => {
  const unitOptions = [
    'Each',
    'Foot',
    'Linear Foot',
    'Square Foot',
    'Cubic Foot',
    'Gallon',
    'Pound',
    'Box',
    'Case',
    'Roll',
    'Sheet',
    'Bag',
    'Bundle'
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Unit" required>
          <SelectField
            value={formData.unit}
            onChange={(e) => onInputChange('unit', e.target.value)}
            options={unitOptions.map(option => ({ value: option, label: option }))}
            required
          />
        </FormField>

        <FormField label="On-Hand Quantity">
          <InputField
            type="number"
            min="0"
            value={formData.onHand}
            onChange={(e) => onInputChange('onHand', parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </FormField>

        <FormField label="Assigned Quantity">
          <InputField
            type="number"
            min="0"
            value={formData.assigned}
            onChange={(e) => onInputChange('assigned', parseInt(e.target.value) || 0)}
            placeholder="0"
            title="Quantity currently assigned to projects"
          />
        </FormField>

        <FormField label="Available Quantity">
          <InputField
            type="number"
            value={formData.available}
            placeholder="Auto-calculated"
            disabled
            title="This is calculated automatically (On-Hand - Assigned)"
          />
        </FormField>

        <FormField label="Minimum Stock">
          <InputField
            type="number"
            min="0"
            value={formData.minStock}
            onChange={(e) => onInputChange('minStock', parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </FormField>

        <FormField label="Maximum Stock">
          <InputField
            type="number"
            min="0"
            value={formData.maxStock}
            onChange={(e) => onInputChange('maxStock', parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </FormField>

        <FormField label="Supplier">
          <InputField
            value={formData.supplier}
            onChange={(e) => onInputChange('supplier', e.target.value)}
            placeholder="Enter supplier name"
          />
        </FormField>

        <FormField label="Storage Location">
          <InputField
            value={formData.location}
            onChange={(e) => onInputChange('location', e.target.value)}
            placeholder="e.g., Warehouse A, Shelf 3, Truck 1"
          />
        </FormField>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Stock Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">On Hand:</span>
            <span className="ml-2 font-medium">{formData.onHand} {formData.unit}</span>
          </div>
          <div>
            <span className="text-gray-500">Assigned:</span>
            <span className="ml-2 font-medium">{formData.assigned} {formData.unit}</span>
          </div>
          <div>
            <span className="text-gray-500">Available:</span>
            <span className="ml-2 font-medium text-green-600">
              {formData.available} {formData.unit}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <span className={`ml-2 font-medium ${
              formData.onHand <= formData.minStock
                ? 'text-red-600'
                : formData.onHand >= formData.maxStock
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}>
              {formData.onHand <= formData.minStock
                ? 'Low Stock'
                : formData.onHand >= formData.maxStock
                ? 'Overstock'
                : 'Normal'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTab;