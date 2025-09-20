// src/pages/inventory/Inventory.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import InventoryHeader from './components/InventoryHeader';
import InventoryStats from './components/InventoryStats';
import InventorySearchFilter from './components/InventorySearchFilter';
import InventoryTable from './components/InventoryTable';
import ProductModal from './components/productModal/ProductModal';
import { 
  deleteProduct, 
  subscribeToProducts,
  type InventoryProduct
} from '../../services';

const Inventory: React.FC = () => {
  // State managed by InventorySearchFilter callbacks
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  
  // Add a refresh trigger state to force InventorySearchFilter to reload
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Memoize callbacks to prevent infinite loops
  const handleProductsChange = useCallback((filteredProducts: InventoryProduct[]) => {
    console.log('📊 Filter returned products:', filteredProducts.length);
    setProducts(filteredProducts);
  }, []);

  const handleLoadingChange = useCallback((isLoading: boolean) => {
    console.log('⏳ Loading state:', isLoading);
    setLoading(isLoading);
  }, []);

  const handleErrorChange = useCallback((errorMessage: string | null) => {
    console.log('❌ Error state:', errorMessage);
    setError(errorMessage);
  }, []);

  // Calculate stats from filtered products - with error handling
  const stats = useMemo(() => {
    try {
      const totalProducts = products.length;
      const lowStockItems = products.filter(p => p.onHand <= p.minStock).length;
      const totalValue = products.reduce((sum, p) => sum + (p.onHand * (p.unitPrice || 0)), 0);
      
      // Count unique trades (updated for new hierarchy)
      const trades = new Set(products.map(p => p.trade || '')).size;
      const totalOnHand = products.reduce((sum, p) => sum + (p.onHand || 0), 0);
      const totalAssigned = products.reduce((sum, p) => sum + (p.assigned || 0), 0);

      return {
        totalProducts,
        lowStockItems,
        totalValue,
        categories: trades, // Using trades instead of categories for the stat
        totalOnHand,
        totalAssigned
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        totalProducts: 0,
        lowStockItems: 0,
        totalValue: 0,
        categories: 0,
        totalOnHand: 0,
        totalAssigned: 0
      };
    }
  }, [products]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleViewProduct = (product: InventoryProduct) => {
    // For now, just edit - could implement a read-only view later
    handleEditProduct(product);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteProduct(productId);
      
      if (result.success) {
        // Remove from local state immediately for better UX
        setProducts(prev => prev.filter(p => p.id !== productId));
        // Trigger a refresh of the InventorySearchFilter
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(result.error?.message || 'Failed to delete product. Please try again.');
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(error?.message || 'An unexpected error occurred while deleting the product.');
    }
  };

  // This will trigger the InventorySearchFilter to reload data
  const handleModalSave = () => {
    console.log('💾 Product saved - triggering refresh');
    setIsModalOpen(false);
    setSelectedProduct(null);
    // Trigger a refresh by incrementing the trigger
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRetry = () => {
    // Force the filter component to reload by clearing error and triggering refresh
    setError(null);
    setLoading(true);
    setRefreshTrigger(prev => prev + 1);
  };

  // Error state
  if (error && !loading) {
    return (
      <div className="space-y-8">
        <InventoryHeader onAddProduct={handleAddProduct} />
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Inventory</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <InventoryHeader onAddProduct={handleAddProduct} />

      {/* Stats */}
      <InventoryStats stats={stats} />

      {/* Search and Filter - Pass refresh trigger to force reloads */}
      <InventorySearchFilter
        key={refreshTrigger} // This will force a full remount and data reload
        onProductsChange={handleProductsChange}
        onLoadingChange={handleLoadingChange}
        onErrorChange={handleErrorChange}
        pageSize={100}
      />

      {/* Products Table - Now receives filtered products */}
      <InventoryTable
        products={products}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        onViewProduct={handleViewProduct}
        loading={loading}
      />

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        product={selectedProduct}
      />
    </div>
  );
};

export default Inventory;