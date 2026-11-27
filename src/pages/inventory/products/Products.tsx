import { useInventoryDeletion } from '../useInventoryDeletion';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus } from 'lucide-react';
import VariableHeader from '../../../mainComponents/ui/VariableHeader';
import ProductsSearchFilter from './components/ProductsSearchFilter';
import ProductsTable from './components/ProductsTable';
import ProductModal from './components/productModal/ProductModal';
import ProductCreationModal from './components/productModal/ProductCreationModal';
import AddFromStoreModal from './components/productModal/AddFromStoreModal';
import { deleteProduct, getProduct, getProductsPage, type InventoryProduct, type ProductFilters } from '../../../services';
import { useIsMobile } from '../../../mobile/inventory/useIsMobile';
import MobilePageHeader from '../../../mobile/inventory/MobilePageHeader';
import MobileSearchBar from '../../../mobile/inventory/MobileSearchBar';
import MobileFilterSheet from '../../../mobile/inventory/MobileFilterSheet';
import ProductsMobileFilter from '../../../mobile/inventory/filters/ProductsMobileFilter';
import MobileCardList from '../../../mobile/inventory/MobileCardList';
import MobileItemCard from '../../../mobile/inventory/MobileItemCard';
import type { StoreResult } from '../../../services/inventory/store';

const Products: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const { hidden, deleteItem } = useInventoryDeletion('products', deleteProduct);
  const visibleProducts = useMemo(() => products.filter(item => !item.id || !hidden.has(item.id)), [products, hidden]);
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
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Mobile-specific state
  const [mobileSearchTerm, setMobileSearchTerm] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const handleProductsChange = useCallback((p: InventoryProduct[]) => setProducts(p), []);
  const handleLoadingChange = useCallback((v: boolean) => setLoading(v), []);
  const handleErrorChange = useCallback((v: string | null) => setError(v), []);
  const handleFilterChange = useCallback((s: typeof filterState) => {
    setPageCursors([undefined]);
    setNextCursor(null);
    setFilterState(s);
  }, []);
  const refreshProducts = useCallback(() => {
    setPageCursors([undefined]);
    setNextCursor(null);
    setDataRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    window.addEventListener('inventory-products-changed', refreshProducts);
    return () => window.removeEventListener('inventory-products-changed', refreshProducts);
  }, [refreshProducts]);

  useEffect(() => {
    if (isMobile) return;
    let active = true;
    setLoading(true);
    setError(null);
    const filters: ProductFilters = {
      tradeId: filterState.tradeFilter || undefined,
      sectionId: filterState.sectionFilter || undefined,
      categoryId: filterState.categoryFilter || undefined,
      subcategoryId: filterState.subcategoryFilter || undefined,
      typeId: filterState.typeFilter || undefined,
      sizeId: filterState.sizeFilter || undefined,
      searchTerm: filterState.searchTerm,
      sortBy: filterState.sortBy as ProductFilters['sortBy'],
      inStock: filterState.stockFilter === 'in',
      lowStock: filterState.stockFilter === 'low',
      outOfStock: filterState.stockFilter === 'out',
    };
    getProductsPage(filters, pageCursors[pageCursors.length - 1]).then(result => {
      if (!active) return;
      if (result.success && result.data) {
        setProducts(result.data.items);
        setNextCursor(result.data.nextCursor);
        setTotalCount(result.data.totalCount);
      } else {
        setProducts([]);
        setError(typeof result.error === 'string' ? result.error : 'Failed to load products');
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [isMobile, filterState, pageCursors, dataRefreshTrigger]);

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
    // A duplicate already has its product details, so open the form instead of
    // asking whether to add it manually or import it from a store.
    setIsModalOpen(false);
    setShowManualModal(true);
  };

  const handleDeleteProduct = (productId: string) => deleteItem(productId, 'product');

  const handleModalSave = () => {
    setIsModalOpen(false);
    setShowManualModal(false);
    setShowStoreModal(false);
    setSelectedProduct(null);
    setModalTitle(undefined);
    refreshProducts();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setShowManualModal(false);
    setShowStoreModal(false);
    setSelectedProduct(null);
    setModalTitle(undefined);
  };

  const handleAddFromStore = async ([item]: StoreResult[]) => {
    setShowStoreModal(false);
    setIsModalOpen(false);
    if (!item) return;

    if (item.existingProductId) {
      const existing = await getProduct(String(item.existingProductId));
      if (existing.success && existing.data) handleEditProduct(existing.data);
      else setError('The matching inventory product could not be opened. Refresh and try again.');
      return;
    }

    setSelectedProduct({
      id: undefined,
      name: item.name,
      storeSource: item.sourceUrl ? {
        sourceUrl: item.sourceUrl, internetNumber: item.internetNumber, storeSku: item.storeSku,
        modelNumber: item.modelNumber, brand: item.brand, currency: item.currency, observedAt: item.observedAt,
      } : undefined,
      brand: item.brand,
      description: item.description,
      sku: item.sku,
      skus: [{ id: '1', store: item.storeName, sku: item.sku }],
      priceEntries: item.price == null ? [] : [{
        id: `price-${Date.now()}`,
        store: item.storeName,
        price: item.price,
        lastUpdated: (item.observedAt ?? new Date().toISOString()).split('T')[0]
      }],
      unitPrice: item.price ?? 0,
      imageUrl: item.imageUrl || '',
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
      supplier: item.storeName,
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
    refreshProducts();
  };



  const mobileProducts = useMemo(() => {
    if (!mobileSearchTerm) return visibleProducts;
    return visibleProducts.filter(p => matchesAllWords(p, mobileSearchTerm));
  }, [visibleProducts, mobileSearchTerm]);

  const productDialogs = (
    <>
      {/* Step 1: Choose how to add (create mode only) */}
      <ProductCreationModal
        isOpen={isModalOpen && modalMode === 'create'}
        onClose={handleModalClose}
        onSelectManual={() => {
          setIsModalOpen(false);
          setShowManualModal(true);
        }}
        onSelectFromStore={() => {
          setIsModalOpen(false);
          setShowStoreModal(true);
        }}
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
        onClose={handleModalClose}
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
    </>
  );

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
              onDelete={handleDeleteProduct}
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
            onDataRefresh={refreshProducts}
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

        {productDialogs}
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────
  if (error && !loading) {
    return (
      <div className="space-y-8">
        <VariableHeader
          title="Product Management"
          subtitle="Track materials, tools, and equipment across all your construction projects."
          Icon={Package}
          onBack={() => navigate('/inventory')}
          rightAction={{ capability: "write:inventory", label: 'Add Product', onClick: handleAddProduct, Icon: Plus }}
        />
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
      <VariableHeader
        title="Product Management"
        subtitle="Track materials, tools, and equipment across all your construction projects."
        Icon={Package}
        onBack={() => navigate('/inventory')}
        rightAction={{ capability: "write:inventory", label: 'Add Product', onClick: handleAddProduct, Icon: Plus }}
      />
      <ProductsSearchFilter
        filterState={filterState}
        onFilterChange={handleFilterChange}
        dataRefreshTrigger={dataRefreshTrigger}
        onDataRefresh={refreshProducts}
        desktopPagination
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
        products={visibleProducts}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        onViewProduct={handleViewProduct}
        onDuplicateProduct={handleDuplicateProduct}
        loading={loading}
        totalCount={Math.max(0, totalCount - (products.length - visibleProducts.length))}
        pageNumber={pageCursors.length}
        hasPrevious={pageCursors.length > 1}
        hasMore={!!nextCursor}
        onPrevious={() => setPageCursors(prev => prev.slice(0, -1))}
        onNext={() => nextCursor && setPageCursors(prev => [...prev, nextCursor])}
      />

      {productDialogs}
    </div>
  );
};

export default Products;
