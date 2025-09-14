import React, { useState, useEffect, useMemo } from 'react';
import InventoryHeader from './components/InventoryHeader';
import InventoryStats from './components/InventoryStats';
import InventorySearchFilter from './components/InventorySearchFilter';
import InventoryTable from './components/InventoryTable';
import ProductModal from './components/productModal/ProductModal';
import { 
  getProducts, 
  deleteProduct, 
  subscribeToProducts,
  type InventoryProduct, 
  type ProductFilters 
} from '../../services';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: ProductFilters = {
        sortBy: 'name',
        sortOrder: 'asc'
      };
      
      const result = await getProducts(filters);
      
      if (result.success && result.data) {
        setProducts(result.data.products);
      } else {
        setError(result.error?.message || 'Failed to load products');
        setProducts([]);
      }
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError(err?.message || 'An unexpected error occurred while loading products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Optional: Set up real-time subscription
  useEffect(() => {
    const unsubscribe = subscribeToProducts((updatedProducts) => {
      setProducts(updatedProducts);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStockItems = products.filter(p => p.onHand <= p.minStock).length;
    const totalValue = products.reduce((sum, p) => sum + (p.onHand * p.unitPrice), 0);
    const categories = new Set(products.map(p => p.category)).size;
    const totalOnHand = products.reduce((sum, p) => sum + p.onHand, 0);
    const totalAssigned = products.reduce((sum, p) => sum + p.assigned, 0);

    return {
      totalProducts,
      lowStockItems,
      totalValue,
      categories,
      totalOnHand,
      totalAssigned
    };
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = searchTerm === '' || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === '' || categoryFilter === 'All Categories' || product.category === categoryFilter;
      const matchesType = typeFilter === '' || typeFilter === 'All Types' || product.type === typeFilter;
      
      let matchesStock = true;
      if (stockFilter === 'In Stock') {
        matchesStock = product.onHand > product.minStock;
      } else if (stockFilter === 'Low Stock') {
        matchesStock = product.onHand <= product.minStock && product.onHand > 0;
      } else if (stockFilter === 'Out of Stock') {
        matchesStock = product.onHand === 0;
      } else if (stockFilter === 'On Order') {
        // This would need additional logic if you track "on order" status
        matchesStock = false; // For now, no products are "on order"
      }
      
      return matchesSearch && matchesCategory && matchesType && matchesStock;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'stock':
          return b.onHand - a.onHand;
        case 'value':
          return (b.onHand * b.unitPrice) - (a.onHand * a.unitPrice);
        case 'lastUpdated':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchTerm, categoryFilter, typeFilter, stockFilter, sortBy]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setModalMode('edit');
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
      } else {
        alert(result.error?.message || 'Failed to delete product. Please try again.');
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(error?.message || 'An unexpected error occurred while deleting the product.');
    }
  };

  const handleModalSave = () => {
    // Just trigger a refresh - the modal handles the actual save
    loadProducts();
  };

  const handleRetry = () => {
    loadProducts();
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

      {/* Search and Filter */}
      <InventorySearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Products Table */}
      <InventoryTable
        products={filteredAndSortedProducts}
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
        mode={modalMode}
      />
    </div>
  );
};

export default Inventory;