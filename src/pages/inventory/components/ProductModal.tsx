import React, { useState, useEffect } from 'react';
import { X, Package, Tag, Warehouse, Plus, Trash2 } from 'lucide-react';
import { FormField } from '../../../mainComponents/forms/FormField';
import { InputField } from '../../../mainComponents/forms/InputField';
import { SelectField } from '../../../mainComponents/forms/SelectField';
import { LoadingButton } from '../../../mainComponents/ui/LoadingButton';
import { Alert } from '../../../mainComponents/ui/Alert';

interface SKUEntry {
  id: string;
  store: string;
  sku: string;
}

// Updated interface to match your existing InventoryProduct
interface ProductData {
  id?: string;
  name: string;
  sku: string; // Main SKU for backwards compatibility
  section: string; // Renamed from category
  category: string; // Renamed from subcategory  
  subcategory: string; // Renamed from subsubcategory
  type: 'Material' | 'Tool' | 'Equipment' | 'Rental' | 'Consumable' | 'Safety';
  size?: string; // New optional field
  description: string;
  unitPrice: number; // Renamed from price
  unit: string;
  onHand: number; // Renamed from onHandQuantity
  assigned: number; // Renamed from assignedQuantity
  available: number; // Auto-calculated
  minStock: number; // Renamed from minimumStock
  maxStock: number; // Renamed from maximumStock
  supplier: string;
  location: string; // Renamed from storageLocation
  lastUpdated: string;
  skus?: SKUEntry[]; // Additional SKUs for multiple stores
  barcode?: string; // Optional barcode field
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductData) => Promise<void>;
  product?: ProductData | null;
  title: string;
}

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  title
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'sku' | 'stock'>('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sizeOptions, setSizeOptions] = useState<string[]>([
    '1/2"', '3/4"', '1"', '1.5"', '2"', '3"', '4"', '6"', // Common pipe sizes
    '2x4', '2x6', '2x8', '2x10', '2x12', // Common lumber sizes
    '4x8', '4x10', '4x12', // Sheet sizes
  ]);
  
  const [formData, setFormData] = useState<ProductData>({
    name: '',
    sku: '',
    section: '',
    category: '',
    subcategory: '',
    type: 'Material',
    size: '',
    description: '',
    unitPrice: 0,
    unit: 'Each',
    onHand: 0,
    assigned: 0,
    available: 0,
    minStock: 0,
    maxStock: 0,
    supplier: '',
    location: '',
    lastUpdated: new Date().toISOString().split('T')[0],
    skus: [{ id: '1', store: '', sku: '' }],
    barcode: ''
  });

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

  const sectionOptions = [
    'Plumbing',
    'Electrical',
    'HVAC',
    'General',
    'Tools',
    'Safety',
    'Fasteners',
    'Lumber',
    'Drywall',
    'Flooring',
    'Roofing',
    'Insulation'
  ];

  const typeOptions: ProductData['type'][] = [
    'Material',
    'Tool', 
    'Equipment',
    'Rental',
    'Consumable',
    'Safety'
  ];

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

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        size: product.size || '',
        skus: product.skus?.length > 0 ? product.skus : [{ id: '1', store: '', sku: product.sku || '' }],
        barcode: product.barcode || ''
      });
    } else {
      // Reset form when creating new product
      setFormData({
        name: '',
        sku: '',
        section: '',
        category: '',
        subcategory: '',
        type: 'Material',
        size: '',
        description: '',
        unitPrice: 0,
        unit: 'Each',
        onHand: 0,
        assigned: 0,
        available: 0,
        minStock: 0,
        maxStock: 0,
        supplier: '',
        location: '',
        lastUpdated: new Date().toISOString().split('T')[0],
        skus: [{ id: '1', store: '', sku: '' }],
        barcode: ''
      });
    }
    setActiveTab('general');
    setError('');
  }, [product, isOpen]);

  const handleInputChange = (field: keyof ProductData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate available quantity when onHand or assigned changes
      if (field === 'onHand' || field === 'assigned') {
        updated.available = updated.onHand - updated.assigned;
      }
      
      return updated;
    });
  };

  const handleSizeChange = (value: string) => {
    // If it's a new size not in options, add it
    if (value && !sizeOptions.includes(value)) {
      setSizeOptions(prev => [...prev, value]);
    }
    handleInputChange('size', value);
  };

  const addSKU = (store: string) => {
    const newId = (Math.max(...formData.skus!.map(s => parseInt(s.id)), 0) + 1).toString();
    setFormData(prev => ({
      ...prev,
      skus: [...(prev.skus || []), { id: newId, store, sku: '' }]
    }));
  };

  const updateSKU = (id: string, field: 'store' | 'sku', value: string) => {
    setFormData(prev => ({
      ...prev,
      skus: prev.skus?.map(sku => 
        sku.id === id ? { ...sku, [field]: value } : sku
      ) || []
    }));
  };

  const removeSKU = (id: string) => {
    if (formData.skus && formData.skus.length > 1) {
      setFormData(prev => ({
        ...prev,
        skus: prev.skus?.filter(sku => sku.id !== id) || []
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Basic validation
      if (!formData.name.trim()) {
        throw new Error('Product name is required');
      }
      if (!formData.sku.trim()) {
        throw new Error('SKU is required');
      }
      if (!formData.section) {
        throw new Error('Section is required');
      }
      if (formData.unitPrice < 0) {
        throw new Error('Price cannot be negative');
      }

      // Update main SKU from first additional SKU if it exists
      if (formData.skus && formData.skus.length > 0 && formData.skus[0].sku) {
        formData.sku = formData.skus[0].sku;
      }

      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Package },
    { id: 'sku' as const, label: 'SKU', icon: Tag },
    { id: 'stock' as const, label: 'Stock', icon: Warehouse }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Product Name" required>
                    <InputField
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter product name"
                      required
                    />
                  </FormField>

                  <FormField label="Main SKU" required>
                    <InputField
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="Enter main SKU"
                      required
                    />
                  </FormField>

                  <FormField label="Section" required>
                    <SelectField
                      value={formData.section}
                      onChange={(e) => handleInputChange('section', e.target.value)}
                      options={sectionOptions.map(option => ({ value: option, label: option }))}
                      placeholder="Select section"
                      required
                    />
                  </FormField>

                  <FormField label="Category">
                    <InputField
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      placeholder="Enter category"
                    />
                  </FormField>

                  <FormField label="Subcategory">
                    <InputField
                      value={formData.subcategory}
                      onChange={(e) => handleInputChange('subcategory', e.target.value)}
                      placeholder="Enter subcategory"
                    />
                  </FormField>

                  <FormField label="Type" required>
                    <SelectField
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      options={typeOptions.map(option => ({ value: option, label: option }))}
                      required
                    />
                  </FormField>

                  <FormField label="Size (Optional)">
                    <div className="space-y-2">
                      <SelectField
                        value={formData.size || ''}
                        onChange={(e) => handleSizeChange(e.target.value)}
                        options={[
                          { value: '', label: 'Select or enter size' },
                          ...sizeOptions.map(option => ({ value: option, label: option }))
                        ]}
                        allowCustom
                      />
                      <InputField
                        value={formData.size || ''}
                        onChange={(e) => handleSizeChange(e.target.value)}
                        placeholder="Or type custom size"
                        className="text-sm"
                      />
                    </div>
                  </FormField>

                  <FormField label="Unit Price" required>
                    <InputField
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unitPrice}
                      onChange={(e) => handleInputChange('unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                    />
                  </FormField>
                </div>

                <FormField label="Description">
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter product description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </FormField>
              </div>
            )}

            {/* SKU Tab */}
            {activeTab === 'sku' && (
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
                    onChange={(e) => handleInputChange('barcode', e.target.value)}
                    placeholder="Enter barcode or internal code"
                  />
                </FormField>
              </div>
            )}

            {/* Stock Tab */}
            {activeTab === 'stock' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Unit" required>
                    <SelectField
                      value={formData.unit}
                      onChange={(e) => handleInputChange('unit', e.target.value)}
                      options={unitOptions.map(option => ({ value: option, label: option }))}
                      required
                    />
                  </FormField>

                  <FormField label="On-Hand Quantity">
                    <InputField
                      type="number"
                      min="0"
                      value={formData.onHand}
                      onChange={(e) => handleInputChange('onHand', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </FormField>

                  <FormField label="Assigned Quantity">
                    <InputField
                      type="number"
                      min="0"
                      value={formData.assigned}
                      onChange={(e) => handleInputChange('assigned', parseInt(e.target.value) || 0)}
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
                      onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </FormField>

                  <FormField label="Maximum Stock">
                    <InputField
                      type="number"
                      min="0"
                      value={formData.maxStock}
                      onChange={(e) => handleInputChange('maxStock', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </FormField>

                  <FormField label="Supplier">
                    <InputField
                      value={formData.supplier}
                      onChange={(e) => handleInputChange('supplier', e.target.value)}
                      placeholder="Enter supplier name"
                    />
                  </FormField>

                  <FormField label="Storage Location">
                    <InputField
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
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
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              disabled={loading}
            >
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {product ? 'Update Product' : 'Create Product'}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;