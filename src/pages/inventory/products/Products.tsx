import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductsHeader from './components/ProductsHeader';
import ProductsSearchFilter from './components/ProductsSearchFilter';
import ProductsTable from './components/ProductsTable';
import ProductModal from './components/productModal/ProductModal';
import ProductCreationModal from './components/productModal/ProductCreationModal';
import AddFromStoreModal from './components/productModal/AddFromStoreModal';
import { deleteProduct, type InventoryProduct } from '../../../services';
import { useIsMobile } from '../../../mobile/inventory/useIsMobile';
import MobilePageHeader from '../../../mobile/inventory/MobilePageHeader';
import MobileSearchBar from '../../../mobile/inventory/MobileSearchBar';
import MobileFilterSheet from '../../../mobile/inventory/MobileFilterSheet';
import ProductsMobileFilter from '../../../mobile/inventory/filters/ProductsMobileFilter';
import MobileCardList from '../../../mobile/inventory/MobileCardList';
import MobileItemCard, { type CardField, type CardBadge } from '../../../mobile/inventory/MobileItemCard';
import type { StoreResult } from '../../../services/inventory/store';

const Products: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);

  const [showManualModal, setShowManualModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);

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

  // Mobile-specific state
  const [mobileSearchTerm, setMobileSearchTerm] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const handleProductsChange = useCallback((p: InventoryProduct[]) => setProducts(p), []);
  const handleLoadingChange = useCallback((v: boolean) => setLoading(v), []);
  const handleErrorChange = useCallback((v: string | null) => setError(v), []);
  const handleFilterChange = useCallback((s: typeof filterState) => setFilterState(s), []);

  const activeFilterCount = useMemo(() => [
    filterState.tradeFilter,
    filterState.sectionFilter,
    filterState.categoryFilter,
    filterState.subcategoryFilter,
    filterState.typeFilter,
    filterState.sizeFilter,
    filterState.stockFilter
  ].filter(Boolean).length, [filterState]);

  const getCheapestPrice = (p: InventoryProduct): string =>
    `$${(p.priceEntries?.length
      ? Math.min(...p.priceEntries.map(e => e.price))
      : (p.unitPrice || 0)
    ).toFixed(2)}`;

  const matchesAllWords = (p: InventoryProduct, term: string): boolean => {
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return true;
    const haystack = [p.name, p.description, p.sku, p.trade, p.section, p.category, p.subcategory, p.type]
      .map(v => v ?? '')
      .join(' ')
      .toLowerCase();
    return words.every(word => haystack.includes(word));
  };

  const stats = useMemo(() => {
    try {
      return {
        totalProducts: products.length,
        lowStockItems: products.filter(p => p.onHand <= p.minStock).length,
        totalValue: products.reduce((s, p) => s + (p.onHand * (p.unitPrice || 0)), 0),
        categories: new Set(products.map(p => p.trade || '')).size,
        totalOnHand: products.reduce((s, p) => s + (p.onHand || 0), 0),
        totalAssigned: products.reduce((s, p) => s + (p.assigned || 0), 0)
      };
    } catch {
      return { totalProducts: 0, lowStockItems: 0, totalValue: 0, categories: 0, totalOnHand: 0, totalAssigned: 0 };
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
    const getUniqueName = (name: string) => {
      const match = name.match(/^(.*?)\s*\((\d+)\)$/);
      return match ? `${match[1]} (${parseInt(match[2]) + 1})` : `${name} (1)`;
    };
    setSelectedProduct({
      ...product,
      id: undefined,
      name: getUniqueName(product.name),
      lastUpdated: new Date().toISOString().split('T')[0],
      skus: product.skus ? [...product.skus] : undefined,
      priceEntries: product.priceEntries?.map(e => ({
        ...e,
        id: `price-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }))
    });
    setModalMode('create');
    setModalTitle('Duplicate Product');
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    try {
      const result = await deleteProduct(productId);
      if (result.success) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        setDataRefreshTrigger(prev => prev + 1);
      } else {
        alert(result.error?.message || 'Failed to delete product.');
      }
    } catch (err: any) {
      alert(err?.message || 'An unexpected error occurred.');
    }
  };

  const handleModalSave = () => {
    setIsModalOpen(false);
    setShowManualModal(false);
    setShowStoreModal(false);
    setSelectedProduct(null);
    setModalTitle(undefined);
    setDataRefreshTrigger(prev => prev + 1);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setShowManualModal(false);
    setShowStoreModal(false);
    setSelectedProduct(null);
    setModalTitle(undefined);
  };

  // Called when user confirms items from AddFromStoreModal.
  // Pre-populates a new ProductModal for each selected item.
  // For now opens the first selected item — bulk handling to be added later.
  const handleAddFromStore = (storeProducts: StoreResult[]) => {
    setShowStoreModal(false);
    setIsModalOpen(false);
    if (storeProducts.length === 0) return;

    const first = storeProducts[0];
    setSelectedProduct({
      id: undefined,
      name: first.name,
      brand: first.brand,
      description: first.description,
      sku: first.sku,
      skus: [{ id: '1', store: first.storeName, sku: first.sku }],
      priceEntries: [{
        id: `price-${Date.now()}`,
        store: first.storeName,
        price: first.price,
        lastUpdated: new Date().toISOString().split('T')[0]
      }],
      unitPrice: first.price,
      imageUrl: first.imageUrl || '',
      trade: '',
      section: '',
      category: '',
      subcategory: '',
      type: '',
      size: '',
      unit: 'Each',
      onHand: 0,
      assigned: 0,
      available: 0,
      minStock: 0,
      maxStock: 0,
      supplier: '',
      location: '',
      lastUpdated: new Date().toISOString().split('T')[0],
      barcode: ''
    } as InventoryProduct);
    setModalMode('create');
    setModalTitle('Add Product from Store');
    setShowManualModal(true);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setDataRefreshTrigger(prev => prev + 1);
  };

  const getStockBadge = (p: InventoryProduct): CardBadge => {
    if (p.onHand === 0) return { label: 'Out of Stock', color: 'red' };
    if (p.onHand <= p.minStock) return { label: 'Low Stock', color: 'yellow' };
    return { label: 'In Stock', color: 'green' };
  };

  const getCardFields = (p: InventoryProduct): CardField[] => [
    { label: 'On Hand', value: `${p.onHand} ${p.unit}`, valueColor: 'default' },
    { label: 'Available', value: `${p.available} ${p.unit}`, valueColor: 'green' },
    { label: 'Price', value: `$${(p.priceEntries?.length ? Math.min(...p.priceEntries.map(e => e.price)) : (p.unitPrice || 0)).toFixed(2)}`, valueColor: 'default' },
    { label: 'Trade', value: p.trade || '—', valueColor: 'default' }
  ];

  const mobileProducts = useMemo(() => {
    if (!mobileSearchTerm) return products;
    return products.filter(p => matchesAllWords(p, mobileSearchTerm));
  }, [products, mobileSearchTerm]);

  // ── Mobile layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobilePageHeader
          title="Products"
          itemCount={mobileProducts.length}
          onAdd={handleAddProduct}
          onBack={() => navigate('/inventory')}
        />

        <MobileSearchBar
          value={mobileSearchTerm}
          onChange={setMobileSearchTerm}
          onOpenFilters={() => setIsFilterSheetOpen(true)}
          activeFilterCount={activeFilterCount}
          placeholder="Search products..."
        />

        <MobileCardList
          loading={loading}
          error={error}
          isEmpty={!loading && mobileProducts.length === 0}
          emptyMessage="No products found"
          emptySubMessage="Try adjusting your filters or add a product."
          onRetry={handleRetry}
        >
          {mobileProducts.map(p => (
            <MobileItemCard
              key={p.id}
              id={p.id!}
              title={p.name}
              imageUrl={p.imageUrl}
              price={getCheapestPrice(p)}
              onView={id => navigate(`/products/${id}/detail`)}
            />
          ))}
        </MobileCardList>

        {/* Hidden filter — mounted immediately so data loads on page open */}
        <div className="sr-only">
          <ProductsSearchFilter
            filterState={filterState}
            onFilterChange={handleFilterChange}
            dataRefreshTrigger={dataRefreshTrigger}
            onDataRefresh={() => setDataRefreshTrigger(prev => prev + 1)}
            onProductsChange={handleProductsChange}
            onLoadingChange={handleLoadingChange}
            onErrorChange={handleErrorChange}
            onSuppliersImport={() => { }}
          />
        </div>

        <MobileFilterSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          onClear={() => handleFilterChange({
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
          })}
          activeFilterCount={activeFilterCount}
        >
          <ProductsMobileFilter
            filterState={filterState}
            onFilterChange={handleFilterChange}
          />
        </MobileFilterSheet>

        {/* Mobile: skip creation choice, go straight to ProductModal */}
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
  }

  // ── Desktop layout ─────────────────────────────────────────────
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
          <button onClick={handleRetry} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
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
        onDataRefresh={() => setDataRefreshTrigger(prev => prev + 1)}
        onProductsChange={handleProductsChange}
        onLoadingChange={handleLoadingChange}
        onErrorChange={handleErrorChange}
        onSuppliersImport={(suppliers, imageUrl) => {
          const importedProduct: Partial<InventoryProduct> = {
            name: '',
            sku: suppliers[0]?.sku || '',
            skus: suppliers.map((s, i) => ({ id: String(i + 1), store: s.supplier, sku: s.sku })),
            priceEntries: suppliers.map((s, i) => ({
              id: `price-temp-${i}`,
              store: s.supplier,
              price: parseFloat(s.price) || 0,
              lastUpdated: new Date().toISOString().split('T')[0]
            })),
            unitPrice: suppliers[0] ? parseFloat(suppliers[0].price) || 0 : 0,
            imageUrl: imageUrl || '',
            trade: filterState.tradeFilter ? (filterState as any).tradeName || '' : ''
          };
          setSelectedProduct(importedProduct as InventoryProduct);
          setModalMode('create');
          setModalTitle('Imported Product Detail');
          setIsModalOpen(true);
        }}
      />
      <ProductsTable
        products={products}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        onViewProduct={handleViewProduct}
        onDuplicateProduct={handleDuplicateProduct}
        loading={loading}
      />

      {/* Step 1: Choose how to add (create mode only) */}
      <ProductCreationModal
        isOpen={isModalOpen && modalMode === 'create'}
        onClose={handleModalClose}
        onSelectManual={() => setShowManualModal(true)}
        onSelectFromStore={() => setShowStoreModal(true)}
      />

      {/* Edit / View — goes directly to ProductModal */}
      <ProductModal
        isOpen={isModalOpen && (modalMode === 'edit' || modalMode === 'view')}
        onClose={handleModalClose}
        onSave={handleModalSave}
        product={selectedProduct}
        mode={modalMode}
        title={modalTitle}
      />

      {/* Manual creation or store-prefilled creation */}
      <ProductModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSave={handleModalSave}
        product={selectedProduct}
        mode="create"
        title={modalTitle ?? 'Add New Product'}
      />

      {/* Store search */}
      <AddFromStoreModal
        isOpen={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        onAddProducts={handleAddFromStore}
      />
    </div>
  );
};

export default Products;