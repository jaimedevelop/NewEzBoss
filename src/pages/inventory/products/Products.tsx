// src/pages/products/Products.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { DocumentSnapshot } from 'firebase/firestore';
import ProductsHeader from './components/ProductsHeader';
import ProductsSearchFilter from './components/ProductsSearchFilter';
import ProductsTable from './components/ProductsTable';
import ProductModal from './components/productModal/ProductModal';
import { 
  deleteProduct, 
  type InventoryProduct
} from '../../../services';

const Products: React.FC = () => {
  // State managed by ProductsSearchFilter callbacks
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [pageSize, setPageSize] = useState<number>(999);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [lastDocuments, setLastDocuments] = useState<(DocumentSnapshot | undefined)[]>([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  
  // Filter states
  const [filterState, setFilterState] = useState({
    searchTerm: '',
    tradeFilter: '',
    sectionFilter: '',
    categoryFilter: '',
    subcategoryFilter: '',
    typeFilter: '',
    sizeFilter: '',
    stockFilter: '',
    locationFilter: '',
    sortBy: 'name'
  });
  
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  // Memoize callbacks
  const handleProductsChange = useCallback((filteredProducts: InventoryProduct[]) => {
    setProducts(filteredProducts);
  }, []);

  const handleLoadingChange = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const handleErrorChange = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  const handleHasMoreChange = useCallback((more: boolean) => {
    setHasMore(more);
  }, []);

  const handleLastDocChange = useCallback((lastDoc: DocumentSnapshot | undefined) => {
    setLastDocuments(prev => {
      const newDocs = [...prev];
      newDocs[currentPage] = lastDoc;
      return newDocs;
    });
  }, [currentPage]);

  // Handle filter changes - RESET pagination when filters change
  const handleFilterChange = useCallback((newFilterState: typeof filterState) => {
    setFilterState(newFilterState);
    setCurrentPage(1);
    setLastDocuments([]);
  }, []);

  // Handle page size change - RESET pagination
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setLastDocuments([]);
  }, []);

  // Handle page navigation
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    try {
      const totalProducts = products.length;
      const lowStockItems = products.filter(p => p.onHand <= p.minStock).length;
      const totalValue = products.reduce((sum, p) => sum + (p.onHand * (p.unitPrice || 0)), 0);
      const trades = new Set(products.map(p => p.trade || '')).size;
      const totalOnHand = products.reduce((sum, p) => sum + (p.onHand || 0), 0);
      const totalAssigned = products.reduce((sum, p) => sum + (p.assigned || 0), 0);

      return {
        totalProducts,
        lowStockItems,
        totalValue,
        categories: trades,
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
    setModalMode('create');
    setModalTitle(undefined);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setModalMode('edit');
    setModalTitle(undefined);
    setIsModalOpen(true);
  };

  const handleViewProduct = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setModalMode('view');
    setModalTitle(undefined);
    setIsModalOpen(true);
  };

  const handleDuplicateProduct = (product: InventoryProduct) => {
    const getUniqueName = (baseName: string) => {
      const match = baseName.match(/^(.*?)\s*\((\d+)\)$/);
      if (match) {
        const base = match[1];
        const num = parseInt(match[2]) + 1;
        return `${base} (${num})`;
      } else {
        return `${baseName} (1)`;
      }
    };

    const duplicatedProduct: InventoryProduct = {
      ...product,
      id: undefined,
      name: getUniqueName(product.name),
      lastUpdated: new Date().toISOString().split('T')[0],
      skus: product.skus ? [...product.skus] : undefined,
      priceEntries: product.priceEntries ? product.priceEntries.map(entry => ({
        ...entry,
        id: `price-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })) : undefined,
    };

    setSelectedProduct(duplicatedProduct);
    setModalMode('create');
    setModalTitle('Duplicate Product');
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteProduct(productId);
      
      if (result.success) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        setDataRefreshTrigger(prev => prev + 1);
      } else {
        alert(result.error?.message || 'Failed to delete product. Please try again.');
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(error?.message || 'An unexpected error occurred while deleting the product.');
    }
  };

  const handleModalSave = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setModalTitle(undefined);
    setDataRefreshTrigger(prev => prev + 1);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setModalTitle(undefined);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setDataRefreshTrigger(prev => prev + 1);
  };

  // Error state
  if (error && !loading) {
    return (
      <div className="space-y-8">
        <ProductsHeader onAddProduct={handleAddProduct} />
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Products</h3>
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
      <ProductsHeader onAddProduct={handleAddProduct} />
      
      <ProductsSearchFilter
        filterState={filterState}
        onFilterChange={handleFilterChange}
        dataRefreshTrigger={dataRefreshTrigger}
        onProductsChange={handleProductsChange}
        onLoadingChange={handleLoadingChange}
        onErrorChange={handleErrorChange}
        onHasMoreChange={handleHasMoreChange}
        onLastDocChange={handleLastDocChange}
        pageSize={pageSize}
        currentPage={currentPage}
        lastDocuments={lastDocuments}
      />

      <ProductsTable
        products={products}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        onViewProduct={handleViewProduct}
        onDuplicateProduct={handleDuplicateProduct}
        loading={loading}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        currentPage={currentPage}
        hasMore={hasMore}
        onPageChange={handlePageChange}
      />

      <ProductModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        product={selectedProduct}
        mode={modalMode}
        title={modalTitle}
      />
    </div>
  );
};

export default Products;