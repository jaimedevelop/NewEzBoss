import React, { useState, useEffect } from 'react';
import { X, Package, Tag, Warehouse } from 'lucide-react';
import { LoadingButton } from '../../../../mainComponents/ui/LoadingButton';
import { Alert } from '../../../../mainComponents/ui/Alert';
import GeneralTab from './GeneralTab';
import SKUTab from './SKUTab';
import StockTab from './StockTab';

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

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductData) => Promise<void>;
  product?: ProductData | null;
  title?: string;
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

  // Determine the modal title
  const modalTitle = title || (product ? 'Edit Product' : 'Add New Product');

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
          <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
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

            {/* Tab Content */}
            {activeTab === 'general' && (
              <GeneralTab 
                formData={formData} 
                onInputChange={handleInputChange} 
              />
            )}

            {activeTab === 'sku' && (
              <SKUTab 
                formData={formData} 
                onInputChange={handleInputChange} 
              />
            )}

            {activeTab === 'stock' && (
              <StockTab 
                formData={formData} 
                onInputChange={handleInputChange} 
              />
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