// src/pages/products/components/ProductsSearchFilter.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Settings } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { getProducts, type InventoryProduct } from '../../../../services';
import {
  getProductTrades,
  getProductSections,
  getProductCategories,
  getProductSubcategories,
  getProductTypes,
  getProductSizes // ✅ Import sizes
} from '../../../../services/categories';
import CategoryEditor from './CategoryEditor';
import UtilitiesModal from '../../../../mainComponents/inventory/UtilitiesModal';
import SizeManager from './SizeManager';
import EmptyChecker from '../../../../mainComponents/inventory/EmptyChecker';
import EzBossImporter, { SupplierData } from './EzBossImporter';
import { Combobox } from '../../../../mainComponents/forms/Combobox';
import { Select } from '../../../../mainComponents/forms/Select';

const stockOptions = [
  { value: '', label: 'All Stock Levels' },
  { value: 'in', label: 'In Stock' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' }
];

const sortOptions = [
  { value: 'name', label: 'Sort by Name' },
  { value: 'trade', label: 'Sort by Trade' },
  { value: 'unitPrice', label: 'Sort by Price' },
  { value: 'onHand', label: 'Sort by Stock' }
];

interface ProductsSearchFilterProps {
  filterState: {
    searchTerm: string;
    tradeFilter: string;
    sectionFilter: string;
    categoryFilter: string;
    subcategoryFilter: string;
    typeFilter: string;
    sizeFilter: string;
    stockFilter: string;
    locationFilter: string;
    sortBy: string;
  };
  onFilterChange: (filterState: any) => void;
  dataRefreshTrigger: number;
  onDataRefresh: () => void;
  onProductsChange: (products: InventoryProduct[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onErrorChange: (error: string | null) => void;
  onSuppliersImport: (suppliers: SupplierData[], imageUrl?: string) => void;
}

const ProductsSearchFilter: React.FC<ProductsSearchFilterProps> = ({
  filterState,
  onFilterChange,
  dataRefreshTrigger,
  onDataRefresh,
  onProductsChange,
  onLoadingChange,
  onErrorChange,
  onSuppliersImport
}) => {
  const { currentUser } = useAuthContext();

  console.log('🔍 [FILTER] Component rendered with currentUser:', currentUser?.uid);

  // Modal state
  const [showUtilitiesModal, setShowUtilitiesModal] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showSizeManager, setShowSizeManager] = useState(false);
  const [showEmptyChecker, setShowEmptyChecker] = useState(false);
  const [showSupplierImporter, setShowSupplierImporter] = useState(false);

  // Check if any filters are active (excluding sortBy which always has a value)
  const hasActiveFilters = useMemo(() => {
    return !!(
      filterState.searchTerm ||
      filterState.tradeFilter ||
      filterState.sectionFilter ||
      filterState.categoryFilter ||
      filterState.subcategoryFilter ||
      filterState.typeFilter ||
      filterState.sizeFilter ||
      filterState.stockFilter
    );
  }, [
    filterState.searchTerm,
    filterState.tradeFilter,
    filterState.sectionFilter,
    filterState.categoryFilter,
    filterState.subcategoryFilter,
    filterState.typeFilter,
    filterState.sizeFilter,
    filterState.stockFilter
  ]);

  // Store ID-to-name mappings for display
  const [tradeMap, setTradeMap] = useState<Map<string, string>>(new Map());
  const [sectionMap, setSectionMap] = useState<Map<string, string>>(new Map());
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [subcategoryMap, setSubcategoryMap] = useState<Map<string, string>>(new Map());
  const [typeMap, setTypeMap] = useState<Map<string, string>>(new Map());
  const [sizeMap, setSizeMap] = useState<Map<string, string>>(new Map());

  // Dropdown options (now using IDs as values)
  const [tradeOptions, setTradeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [sectionOptions, setSectionOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [typeOptions, setTypeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [sizeOptions, setSizeOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Cache for fetched products (before local search filtering)
  const [allProducts, setAllProducts] = useState<InventoryProduct[]>([]);

  console.log('🔍 [FILTER] Current sizeOptions state:', sizeOptions);

  // Load trades on mount
  useEffect(() => {
    const loadTrades = async () => {
      if (!currentUser?.uid) return;

      const result = await getProductTrades(currentUser.uid);
      if (result.success && result.data) {
        const map = new Map(result.data.map(trade => [trade.id!, trade.name]));
        setTradeMap(map);

        setTradeOptions(result.data.map(trade => ({
          value: trade.id!,
          label: trade.name
        })));
      }
    };

    loadTrades();
  }, [currentUser?.uid]);

  // ✅ Load sizes based on selected trade (trade-dependent)
  useEffect(() => {
    const loadSizes = async () => {
      if (!currentUser?.uid) {
        setSizeOptions([]);
        return;
      }

      // If no trade is selected, clear sizes
      if (!filterState.tradeFilter) {
        setSizeOptions([]);
        setSizeMap(new Map());
        return;
      }

      try {
        // Load sizes for the selected trade
        const result = await getProductSizes(currentUser.uid, filterState.tradeFilter);

        if (result.success && result.data) {
          const map = new Map(result.data.map(size => [size.id!, size.name]));
          setSizeMap(map);

          const options = result.data.map(size => ({
            value: size.id!,
            label: size.name
          }));

          setSizeOptions(options);
        } else {
          setSizeOptions([]);
          setSizeMap(new Map());
        }
      } catch (error) {
        console.error('❌ [FILTER] Error loading sizes:', error);
        setSizeOptions([]);
        setSizeMap(new Map());
      }
    };

    loadSizes();
  }, [currentUser?.uid, filterState.tradeFilter]);

  // Load sections when trade changes
  useEffect(() => {
    const loadSections = async () => {
      if (!currentUser?.uid || !filterState.tradeFilter) {
        setSectionOptions([]);
        return;
      }

      const result = await getProductSections(filterState.tradeFilter, currentUser.uid);
      if (result.success && result.data) {
        const map = new Map(result.data.map(section => [section.id!, section.name]));
        setSectionMap(map);

        setSectionOptions(result.data.map(section => ({
          value: section.id!,
          label: section.name
        })));
      }
    };

    loadSections();
  }, [currentUser?.uid, filterState.tradeFilter]);

  // Load categories when section changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!currentUser?.uid || !filterState.sectionFilter) {
        setCategoryOptions([]);
        return;
      }

      const result = await getProductCategories(filterState.sectionFilter, currentUser.uid);
      if (result.success && result.data) {
        const map = new Map(result.data.map(category => [category.id!, category.name]));
        setCategoryMap(map);

        setCategoryOptions(result.data.map(category => ({
          value: category.id!,
          label: category.name
        })));
      }
    };

    loadCategories();
  }, [currentUser?.uid, filterState.sectionFilter]);

  // Load subcategories when category changes
  useEffect(() => {
    const loadSubcategories = async () => {
      if (!currentUser?.uid || !filterState.categoryFilter) {
        setSubcategoryOptions([]);
        return;
      }

      const result = await getProductSubcategories(filterState.categoryFilter, currentUser.uid);
      if (result.success && result.data) {
        const map = new Map(result.data.map(subcategory => [subcategory.id!, subcategory.name]));
        setSubcategoryMap(map);

        setSubcategoryOptions(result.data.map(subcategory => ({
          value: subcategory.id!,
          label: subcategory.name
        })));
      }
    };

    loadSubcategories();
  }, [currentUser?.uid, filterState.categoryFilter]);

  // Load types when subcategory changes
  useEffect(() => {
    const loadTypes = async () => {
      if (!currentUser?.uid || !filterState.subcategoryFilter) {
        setTypeOptions([]);
        return;
      }

      const result = await getProductTypes(filterState.subcategoryFilter, currentUser.uid);
      if (result.success && result.data) {
        const map = new Map(result.data.map(type => [type.id!, type.name]));
        setTypeMap(map);

        setTypeOptions(result.data.map(type => ({
          value: type.id!,
          label: type.name
        })));
      }
    };

    loadTypes();
  }, [currentUser?.uid, filterState.subcategoryFilter]);

  useEffect(() => {
    const loadProducts = async () => {
      // Safety checks: Only load if Maps are ready for active filters
      if (filterState.tradeFilter && !tradeMap.has(filterState.tradeFilter)) {
        console.log('⏳ Waiting for tradeMap to populate...');
        return;
      }
      if (filterState.sectionFilter && !sectionMap.has(filterState.sectionFilter)) {
        console.log('⏳ Waiting for sectionMap to populate...');
        return;
      }
      if (filterState.categoryFilter && !categoryMap.has(filterState.categoryFilter)) {
        console.log('⏳ Waiting for categoryMap to populate...');
        return;
      }
      if (filterState.subcategoryFilter && !subcategoryMap.has(filterState.subcategoryFilter)) {
        console.log('⏳ Waiting for subcategoryMap to populate...');
        return;
      }
      if (filterState.typeFilter && !typeMap.has(filterState.typeFilter)) {
        console.log('⏳ Waiting for typeMap to populate...');
        return;
      }
      if (filterState.sizeFilter && !sizeMap.has(filterState.sizeFilter)) {
        console.log('⏳ Waiting for sizeMap to populate...');
        return;
      }

      onLoadingChange(true);
      onErrorChange(null);

      try {
        const filters = {
          trade: filterState.tradeFilter ? tradeMap.get(filterState.tradeFilter) : undefined,
          section: filterState.sectionFilter ? sectionMap.get(filterState.sectionFilter) : undefined,
          category: filterState.categoryFilter ? categoryMap.get(filterState.categoryFilter) : undefined,
          subcategory: filterState.subcategoryFilter ? subcategoryMap.get(filterState.subcategoryFilter) : undefined,
          type: filterState.typeFilter ? typeMap.get(filterState.typeFilter) : undefined,
          size: filterState.sizeFilter ? sizeMap.get(filterState.sizeFilter) : undefined,
          searchTerm: filterState.searchTerm || undefined,
          sortBy: filterState.sortBy as any,
          sortOrder: 'asc' as const
        };

        const result = await getProducts(filters);

        if (result.success && result.data) {
          setAllProducts(result.data);
          onProductsChange(result.data);
        } else {
          onErrorChange(result.error?.toString() || 'Failed to load products');
          setAllProducts([]);
          onProductsChange([]);
        }
      } catch (error) {
        console.error('Error loading products:', error);
        onErrorChange('An error occurred while loading products');
        setAllProducts([]);
        onProductsChange([]);
      } finally {
        onLoadingChange(false);
      }
    };

    loadProducts();
  }, [
    filterState.tradeFilter,
    filterState.sectionFilter,
    filterState.categoryFilter,
    filterState.subcategoryFilter,
    filterState.typeFilter,
    filterState.sizeFilter,
    filterState.stockFilter,
    filterState.sortBy,
    dataRefreshTrigger
  ]);

  // Local filtering for search term
  useEffect(() => {
    if (!filterState.searchTerm) {
      // If no search term, reset to the full set of fetched products
      onProductsChange(allProducts);
      return;
    }

    const term = filterState.searchTerm.toLowerCase();
    const filtered = allProducts.filter((product: InventoryProduct) => {
      const nameMatch = product.name?.toLowerCase().includes(term);
      const descMatch = product.description?.toLowerCase().includes(term);
      const skuMatch = product.sku?.toLowerCase().includes(term);
      const hierarchicalMatch = [
        product.trade,
        product.section,
        product.category,
        product.subcategory,
        product.type
      ].some(val => val?.toLowerCase().includes(term));

      return nameMatch || descMatch || skuMatch || hierarchicalMatch;
    });

    onProductsChange(filtered);
  }, [filterState.searchTerm, allProducts, onProductsChange]);

  const handleFilterChange = (field: string, value: string) => {
    const newFilterState = { ...filterState, [field]: value };

    // Cascading resets for hierarchy - NOW includes sizeFilter (trade-dependent)
    if (field === 'tradeFilter') {
      newFilterState.sectionFilter = '';
      newFilterState.categoryFilter = '';
      newFilterState.subcategoryFilter = '';
      newFilterState.typeFilter = '';
      newFilterState.sizeFilter = '';  // ✅ Clear size when trade changes
    } else if (field === 'sectionFilter') {
      newFilterState.categoryFilter = '';
      newFilterState.subcategoryFilter = '';
      newFilterState.typeFilter = '';
    } else if (field === 'categoryFilter') {
      newFilterState.subcategoryFilter = '';
      newFilterState.typeFilter = '';
    } else if (field === 'subcategoryFilter') {
      newFilterState.typeFilter = '';
    }

    onFilterChange(newFilterState);
  };

  const handleClearFilters = () => {
    onFilterChange({
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
  };

  const handleCategoryUpdate = async () => {
    if (!currentUser?.uid) return;

    const result = await getProductTrades(currentUser.uid);
    if (result.success && result.data) {
      const map = new Map(result.data.map(trade => [trade.id!, trade.name]));
      setTradeMap(map);
      setTradeOptions(result.data.map(trade => ({
        value: trade.id!,
        label: trade.name
      })));
    }

    onDataRefresh();
  };

  const handleSizeUpdate = async () => {
    // Reload sizes for the currently selected trade
    if (currentUser?.uid && filterState.tradeFilter) {
      const result = await getProductSizes(currentUser.uid, filterState.tradeFilter);
      if (result.success && result.data) {
        const map = new Map(result.data.map(size => [size.id!, size.name]));
        setSizeMap(map);
        setSizeOptions(result.data.map(size => ({
          value: size.id!,
          label: size.name
        })));
      }
    }
    onDataRefresh();
  };

  const handleCategoryEditorClose = () => {
    setShowCategoryEditor(false);
  };

  console.log('🔍 [FILTER] About to render. sizeOptions:', sizeOptions);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 space-y-4">
          {/* Top Row - Search Bar + Manage Categories Button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name, description, or hierarchy..."
                value={filterState.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowUtilitiesModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Settings className="h-5 w-5" />
              Utilities
            </button>
          </div>

          {/* Bottom Row - Filter Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Trade */}
            <Combobox
              value={filterState.tradeFilter}
              onChange={(val) => handleFilterChange('tradeFilter', val)}
              options={tradeOptions}
              placeholder="All Trades"
            />

            {/* Section */}
            <Combobox
              value={filterState.sectionFilter}
              onChange={(val) => handleFilterChange('sectionFilter', val)}
              options={sectionOptions}
              placeholder="All Sections"
              disabled={!filterState.tradeFilter}
            />

            {/* Category */}
            <Combobox
              value={filterState.categoryFilter}
              onChange={(val) => handleFilterChange('categoryFilter', val)}
              options={categoryOptions}
              placeholder="All Categories"
              disabled={!filterState.sectionFilter}
            />

            {/* Subcategory */}
            <Combobox
              value={filterState.subcategoryFilter}
              onChange={(val) => handleFilterChange('subcategoryFilter', val)}
              options={subcategoryOptions}
              placeholder="All Subcategories"
              disabled={!filterState.categoryFilter}
            />

            {/* Type */}
            <Combobox
              value={filterState.typeFilter}
              onChange={(val) => handleFilterChange('typeFilter', val)}
              options={typeOptions}
              placeholder="All Types"
              disabled={!filterState.subcategoryFilter}
            />

            {/* ✅ Size - Trade-Dependent */}
            <Combobox
              value={filterState.sizeFilter}
              onChange={(val) => handleFilterChange('sizeFilter', val)}
              options={sizeOptions}
              placeholder="All Sizes"
              disabled={!filterState.tradeFilter}
            />

            {/* Stock Filter */}
            <Select
              value={filterState.stockFilter}
              onChange={(val) => handleFilterChange('stockFilter', val)}
              options={stockOptions}
              placeholder="All Stock Levels"
            />

            {/* Sort By */}
            <Select
              value={filterState.sortBy}
              onChange={(val) => handleFilterChange('sortBy', val)}
              options={sortOptions}
              placeholder="Sort By..."
            />

            {/* Clear All Button */}
            <button
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className={`px-4 py-2 border-2 rounded-lg font-medium transition-colors ${hasActiveFilters
                ? 'border-orange-600 text-orange-600 hover:bg-orange-50 cursor-pointer'
                : 'border-gray-300 text-gray-400 cursor-not-allowed'
                }`}
            >
              Clear All
            </button>
          </div>

        </div>
      </div>

      {/* Utilities Modal */}
      <UtilitiesModal
        isOpen={showUtilitiesModal}
        onClose={() => setShowUtilitiesModal(false)}
        onCategoryManagerClick={() => {
          setShowUtilitiesModal(false);
          setShowCategoryEditor(true);
        }}
        onSizeManagerClick={() => {
          setShowUtilitiesModal(false);
          setShowSizeManager(true);
        }}
        onEmptyCategoryCheckClick={() => {
          setShowUtilitiesModal(false);
          setShowEmptyChecker(true);
        }}
        onSupplierImporterClick={() => {
          setShowUtilitiesModal(false);
          setShowSupplierImporter(true);
        }}
        moduleName="Products"
      />

      <EzBossImporter
        onSuppliersImport={(suppliers, imageUrl) => {
          onSuppliersImport(suppliers, imageUrl);
          setShowSupplierImporter(false);
        }}
        triggerOpen={showSupplierImporter}
      />

      {/* Category Editor Modal */}
      {showCategoryEditor && (
        <CategoryEditor
          isOpen={showCategoryEditor}
          onClose={handleCategoryEditorClose}
          onCategoryUpdated={handleCategoryUpdate}
          onBack={() => {
            setShowCategoryEditor(false);
            setShowUtilitiesModal(true);
          }}
        />
      )}

      {/* Size Manager Modal */}
      {showSizeManager && (
        <SizeManager
          isOpen={showSizeManager}
          onClose={() => setShowSizeManager(false)}
          onSizeUpdated={handleSizeUpdate}
          onBack={() => {
            setShowSizeManager(false);
            setShowUtilitiesModal(true);
          }}
        />
      )}

      {/* Empty Category Checker Modal */}
      {showEmptyChecker && (
        <EmptyChecker
          isOpen={showEmptyChecker}
          onClose={() => setShowEmptyChecker(false)}
          onBack={() => {
            setShowEmptyChecker(false);
            setShowUtilitiesModal(true);
          }}
          module="Products"
        />
      )}
    </>
  );
};

export default ProductsSearchFilter;