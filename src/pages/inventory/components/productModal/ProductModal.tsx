import React, { useEffect, useMemo, useCallback } from 'react';
import { X, Package, Tag, Warehouse, DollarSign, Clock } from 'lucide-react';
import { LoadingButton } from '../../../../mainComponents/ui/LoadingButton';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { ProductCreationProvider, useProductCreation } from '../../../../contexts/ProductCreationContext';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
  MemoizedGeneralTab,
  MemoizedSKUTab,
  MemoizedStockTab,
  MemoizedPriceTab,
  MemoizedHistoryTab
} from './MemoizedTabs';
import { createProduct, updateProduct, type InventoryProduct } from '../../../../services';
import { addPriceEntry, updatePriceEntry } from '../../../../services/pricing';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  product?: InventoryProduct | null;
  title?: string;
  mode?: 'create' | 'edit' | 'view';
}

// Tab component with error indicators
function TabButton({ 
  id, 
  label, 
  icon: Icon,
  isActive, 
  onClick, 
  hasError,
  disabled 
}: { 
  id: string; 
  label: string; 
  icon: React.ComponentType<any>;
  isActive: boolean; 
  onClick: () => void;
  hasError?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
        isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-default' : ''}`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {hasError && !disabled && (
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
  title,
  mode = 'create'
}: { 
  onClose: () => void; 
  onSave: () => void; 
  product?: InventoryProduct | null;
  title?: string;
  mode?: 'create' | 'edit' | 'view';
}) {
  const { currentUser } = useAuthContext();
  const { 
    state, 
    setActiveTab, 
    validateForm, 
    setSubmitting, 
    resetForm
  } = useProductCreation();
  
  const { formData, activeTab, isSubmitting, isDirty } = state;
  const isViewMode = mode === 'view';

  // Determine the modal title based on mode
  const modalTitle = title || (
    mode === 'view' ? 'View Product' : 
    mode === 'edit' ? 'Edit Product' : 
    'Add New Product'
  );

  // Check for errors in each tab (only in non-view mode)
  const getTabErrors = (tabName: string) => {
    if (isViewMode) return false;
    
    const tabFieldMap: Record<string, string[]> = {
      general: ['name', 'trade', 'unit', 'description'],
      price: ['unitPrice'],
      sku: ['sku', 'barcode'],
      stock: ['onHand', 'assigned', 'minStock', 'maxStock', 'location']
    };
    
    const fields = tabFieldMap[tabName] || [];
    return fields.some(field => formData.errors[field]);
  };

  // Simplified submit (disabled in view mode)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isViewMode) return; // Prevent submission in view mode
    
    if (!validateForm()) {
      const tabsWithErrors = ['general', 'price', 'sku', 'stock'].find(tab => getTabErrors(tab));
      if (tabsWithErrors) {
        setActiveTab(tabsWithErrors as any);
      }
      return;
    }

    setSubmitting(true);
    
    try {
      // Update main SKU from first additional SKU if it exists
      let mainSKU = formData.sku;
      if (formData.skus && formData.skus.length > 0 && formData.skus[0].sku) {
        mainSKU = formData.skus[0].sku;
      }

      // Prepare price entries with proper IDs
      const priceEntries = formData.priceEntries
        .filter(entry => entry.store && entry.price)
        .map(entry => ({
          id: entry.id || `price-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          store: entry.store,
          price: parseFloat(entry.price),
          lastUpdated: new Date().toISOString().split('T')[0]
        }));

      // Convert to InventoryProduct format for the database
      const productForDatabase: Omit<InventoryProduct, 'id' | 'createdAt' | 'updatedAt' | 'available'> = {
        name: formData.name,
        sku: mainSKU,
        brand: formData.brand,
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
        supplier: '',
        location: formData.location,
        lastUpdated: formData.lastUpdated,
        size: formData.size,
        skus: formData.skus,
        priceEntries: priceEntries,
        barcode: formData.barcode
      };

      let result;
      if (mode === 'edit' && product?.id) {
        result = await updateProduct(product.id, productForDatabase);
      } else {
        result = await createProduct(productForDatabase);
      }

      if (result.success) {
        onSave();
        resetForm();
        onClose();
      } else {
        throw new Error(result.error?.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error submitting product:', error);
      alert(`Error saving product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // In view mode, just close without confirmation
    if (isViewMode) {
      resetForm();
      onClose();
      return;
    }
    
    // In edit/create mode, check for unsaved changes
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
    { id: 'price' as const, label: 'Price', icon: DollarSign },
    { id: 'history' as const, label: 'History', icon: Clock }
  ];

  const renderTabContent = useCallback(() => {
    // Use memoized components to prevent unnecessary re-renders
    switch (activeTab) {
      case 'general':
        return <MemoizedGeneralTab disabled={isViewMode} />;
      case 'sku':
        return <MemoizedSKUTab disabled={isViewMode} />;
      case 'stock':
        return <MemoizedStockTab disabled={isViewMode} />;
      case 'price':
        return <MemoizedPriceTab disabled={isViewMode} />;
      case 'history': 
        return <MemoizedHistoryTab disabled={isViewMode} />;
      default:
        return <MemoizedGeneralTab disabled={isViewMode} />;
    }
  }, [activeTab, isViewMode]);

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
                disabled={false}
              />
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 min-h-[300px]">
              {/* Tab Content */}
              <div className="relative">
                {renderTabContent()}
              </div>
            </div>
          </div>

          {/* Footer */}
          {!isViewMode && (
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
                {mode === 'edit' ? 'Update Product' : 'Create Product'}
              </LoadingButton>
            </div>
          )}
          
          {/* View mode footer - just a close button */}
          {isViewMode && (
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// Main component with provider wrapper
const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, title, mode = 'create' }) => {
  if (!isOpen) return null;

  // Prepare initial product data BEFORE rendering the provider
  const initialProductData = useMemo(() => {
    if (product) {
      return {
        id: product.id,
        name: product.name || '',
        brand: product.brand || '',
        trade: product.trade || '',
        section: product.section || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        type: product.type || '',
        size: product.size || '',
        description: product.description || '',
        unit: product.unit || 'Each',
        unitPrice: product.unitPrice || 0,
        priceEntries: product.priceEntries ? product.priceEntries.map(price => ({
          id: price.id || `price-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          store: price.store || '',
          price: price.price?.toString() || '0',
          isNew: false
        })) : [],
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
      };
    }
    return undefined;
  }, [product]);

  return (
    <ProductCreationProvider initialProduct={initialProductData}>
      <ProductModalContent 
        onClose={onClose}
        onSave={onSave}
        product={product}
        title={title}
        mode={mode}
      />
    </ProductCreationProvider>
  );
};

export default ProductModal;