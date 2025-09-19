import React, { useEffect } from 'react';
import { X, Package, Tag, Warehouse, DollarSign } from 'lucide-react';
import { LoadingButton } from '../../../../mainComponents/ui/LoadingButton';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { ProductCreationProvider, useProductCreation } from '../../../../contexts/ProductCreationContext';
import GeneralTab from './GeneralTab';
import SKUTab from './SKUTab';
import StockTab from './StockTab';
import PriceTab from './PriceTab';
import { createProduct, updateProduct, type InventoryProduct } from '../../../../services';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  product?: InventoryProduct | null;
  title?: string;
}

// Tab component with error indicators
function TabButton({ 
  id, 
  label, 
  icon: Icon,
  isActive, 
  onClick, 
  hasError 
}: { 
  id: string; 
  label: string; 
  icon: React.ComponentType<any>;
  isActive: boolean; 
  onClick: () => void;
  hasError?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
        isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {hasError && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      )}
    </button>
  );
}

// Modal content component (needs to be inside the provider)
function ProductModalContent({ 
  onClose, 
  onSave, 
  product, 
  title 
}: { 
  onClose: () => void; 
  onSave: () => void; 
  product?: InventoryProduct | null;
  title?: string;
}) {
  const { 
    state, 
    setActiveTab, 
    validateForm, 
    setSubmitting, 
    resetForm, 
    initializeForm 
  } = useProductCreation();
  
  const { formData, activeTab, isSubmitting, isDirty } = state;

  // Determine the modal title
  const modalTitle = title || (product ? 'Edit Product' : 'Add New Product');

  // Initialize form data when product changes or modal opens
  useEffect(() => {
    if (product) {
      // Convert InventoryProduct to ProductFormData format
      initializeForm({
        id: product.id,
        name: product.name || '',
        brand: product.brand || '', // NEW - Include brand field
        trade: product.trade || '',
        section: product.section || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        type: product.type || '',
        size: product.size || '',
        description: product.description || '',
        unit: product.unit || 'Each',
        unitPrice: product.unitPrice || 0,
        priceEntries: [], // Will be loaded by PriceTab
        sku: product.sku || '',
        skus: product.skus?.length > 0 ? product.skus : [{ id: '1', store: '', sku: product.sku || '' }],
        barcode: product.barcode || '',
        onHand: product.onHand || 0,
        assigned: product.assigned || 0,
        available: product.available || 0,
        minStock: product.minStock || 0,
        maxStock: product.maxStock || 0,
        location: product.location || '',
        lastUpdated: product.lastUpdated || new Date().toISOString().split('T')[0]
      });
    } else {
      resetForm();
    }
  }, [product, initializeForm, resetForm]);

  // Check for errors in each tab
  const getTabErrors = (tabName: string) => {
    const tabFieldMap: Record<string, string[]> = {
      general: ['name', 'trade', 'unit', 'description'],
      price: ['unitPrice'],
      sku: ['sku', 'barcode'],
      stock: ['onHand', 'assigned', 'minStock', 'maxStock', 'location']
    };
    
    const fields = tabFieldMap[tabName] || [];
    return fields.some(field => formData.errors[field]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Form submission started');
    console.log('🚀 Current form data at submit:', formData);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      // Find the first tab with errors and switch to it
      const tabsWithErrors = ['general', 'price', 'sku', 'stock'].find(tab => getTabErrors(tab));
      if (tabsWithErrors) {
        console.log('🔄 Switching to tab with errors:', tabsWithErrors);
        setActiveTab(tabsWithErrors as any);
      }
      return;
    }

    console.log('✅ Form validation passed');
    setSubmitting(true);
    
    try {
      // Update main SKU from first additional SKU if it exists
      let mainSKU = formData.sku;
      if (formData.skus && formData.skus.length > 0 && formData.skus[0].sku) {
        mainSKU = formData.skus[0].sku;
      }

      console.log('🔧 Preparing product data for database...');

      // Convert to InventoryProduct format for the database
      const productForDatabase: Omit<InventoryProduct, 'id' | 'createdAt' | 'updatedAt' | 'available'> = {
        name: formData.name,
        sku: mainSKU,
        brand: formData.brand, // NEW - Include brand field
        trade: formData.trade,
        section: formData.section,
        category: formData.category,
        subcategory: formData.subcategory,
        type: formData.type,
        description: formData.description,
        unitPrice: formData.unitPrice,
        unit: formData.unit,
        onHand: formData.onHand,
        assigned: formData.assigned,
        minStock: formData.minStock,
        maxStock: formData.maxStock,
        supplier: '', // Default empty supplier since we removed it from the form
        location: formData.location,
        lastUpdated: formData.lastUpdated,
        // Optional fields
        size: formData.size,
        skus: formData.skus,
        barcode: formData.barcode
      };

      console.log('📝 Product data for database:', productForDatabase);

      let result;
      if (product?.id) {
        console.log('🔄 Updating existing product...');
        // Update existing product
        result = await updateProduct(product.id, productForDatabase);
      } else {
        console.log('➕ Creating new product...');
        // Create new product
        result = await createProduct(productForDatabase);
      }

      console.log('📊 Database operation result:', result);

      if (result.success) {
        console.log('✅ Product saved successfully!');
        onSave(); // Call the callback to refresh data
        resetForm();
        onClose();
      } else {
        console.log('❌ Database operation failed:', result.error);
        throw new Error(result.error?.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('💥 Error submitting product:', error);
      // You might want to show this error in the UI
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }
    resetForm();
    onClose();
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Package },
    { id: 'sku' as const, label: 'SKU', icon: Tag },
    { id: 'stock' as const, label: 'Stock', icon: Warehouse },
    { id: 'price' as const, label: 'Price', icon: DollarSign }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab />;
      case 'sku':
        return <SKUTab />;
      case 'stock':
        return <StockTab />;
      case 'price':
        return <PriceTab />;
      default:
        return <GeneralTab />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <TabButton
                key={tab.id}
                id={tab.id}
                label={tab.label}
                icon={tab.icon}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                hasError={getTabErrors(tab.id)}
              />
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 min-h-[300px]">
              {/* Global errors */}
              {Object.keys(formData.errors).length > 0 && (
                <Alert variant="error" className="mb-4">
                  Please correct the errors in the form before submitting.
                </Alert>
              )}

              {/* Tab Content */}
              <div className="relative">
                {renderTabContent()}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {product ? 'Update Product' : 'Create Product'}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main component with provider wrapper
const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, title }) => {
  if (!isOpen) return null;

  return (
    <ProductCreationProvider>
      <ProductModalContent 
        onClose={onClose}
        onSave={onSave}
        product={product}
        title={title}
      />
    </ProductCreationProvider>
  );
};

export default ProductModal;