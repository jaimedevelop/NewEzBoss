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
  getProductSizes
} from '../../../../services/categories';
import CategoryEditor from './CategoryEditor';
import UtilitiesModal from '../../../../mainComponents/inventory/UtilitiesModal';
import SizeManager from './SizeManager';
import EmptyChecker from '../../../../mainComponents/inventory/EmptyChecker';
import EzBossImporter, { SupplierData } from './EzBossImporter';
import { Dropdown } from '../../../../mainComponents/forms/Dropdown';
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

// Split search term into words and require all words appear somewhere in the combined fields
const matchesAllWords = (item: InventoryProduct, term: string): boolean => {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [
    item.name,
    item.description,
    item.sku,
    item.trade,
    item.section,
    item.category,
    item.subcategory,
    item.type
  ]
    .map(v => v ?? '')
    .join(' ')
    .toLowerCase();
  return words.every(word => haystack.includes(word));
};

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

  // Modal state
  const [showUtilitiesModal, setShowUtilitiesModal] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showSizeManager, setShowSizeManager] = useState(false);
  const [showEmptyChecker, setShowEmptyChecker] = useState(false);
  const [showSupplierImporter, setShowSupplierImporter] = useState(false);

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

  const [tradeMap, setTradeMap] = useState<Map<string, string>>(new Map());
  const [sectionMap, setSectionMap] = useState<Map<string, string>>(new Map());
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [subcategoryMap, setSubcategoryMap] = useState<Map<string, string>>(new Map());
  const [typeMap, setTypeMap] = useState<Map<string, string>>(new Map());
  const [sizeMap, setSizeMap] = useState<Map<string, string>>(new Map());

  const [tradeOptions, setTradeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [sectionOptions, setSectionOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [typeOptions, setTypeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [sizeOptions, setSizeOptions] = useState<Array<{ value: string; label: string }>>([]);

  const [allProducts, setAllProducts] = useState<InventoryProduct[]>([]);

  // Load trades on mount
  useEffect(() => {
    const loadTrades = async () => {
      if (!currentUser?.uid) return;
      const result = await getProductTrades(currentUser.uid);
      if (result.success && result.data) {
        const map = new Map(result.data.map(trade => [trade.id!, trade.name]));
        setTradeMap(map);
        setTradeOptions(result.data.map(trade => ({ value: trade.id!, label: trade.name })));
      }
    };
    loadTrades();
  }, [currentUser?.uid]);

  // Load sizes based on selected trade
  useEffect(() => {
    const loadSizes = async () => {
      if (!currentUser?.uid || !filterState.tradeFilter) {
        setSizeOptions([]);
        setSizeMap(new Map());
        return;
      }
      try {
        const result = await getProductSizes(currentUser.uid, filterState.tradeFilter);
        if (result.success && result.data) {
          const map = new Map(result.data.map(size => [size.id!, size.name]));
          setSizeMap(map);
          setSizeOptions(result.data.map(size => ({ value: size.id!, label: size.name })));
        } else {
          setSizeOptions([]);
          setSizeMap(new Map());
        }
      } catch (error) {
        console.error('Error loading sizes:', error);
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
        const map = new Map(result.data.map(s => [s.id!, s.name]));
        setSectionMap(map);
        setSectionOptions(result.data.map(s => ({ value: s.id!, label: s.name })));
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
        const map = new Map(result.data.map(c => [c.id!, c.name]));
        setCategoryMap(map);
        setCategoryOptions(result.data.map(c => ({ value: c.id!, label: c.name })));
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
        const map = new Map(result.data.map(sc => [sc.id!, sc.name]));
        setSubcategoryMap(map);
        setSubcategoryOptions(result.data.map(sc => ({ value: sc.id!, label: sc.name })));
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
        const map = new Map(result.data.map(t => [t.id!, t.name]));
        setTypeMap(map);
        setTypeOptions(result.data.map(t => ({ value: t.id!, label: t.name })));
      }
    };
    loadTypes();
  }, [currentUser?.uid, filterState.subcategoryFilter]);

  // Fetch products from service (no search term — handled locally)
  useEffect(() => {
    const loadProducts = async () => {
      if (filterState.tradeFilter && !tradeMap.has(filterState.tradeFilter)) return;
      if (filterState.sectionFilter && !sectionMap.has(filterState.sectionFilter)) return;
      if (filterState.categoryFilter && !categoryMap.has(filterState.categoryFilter)) return;
      if (filterState.subcategoryFilter && !subcategoryMap.has(filterState.subcategoryFilter)) return;
      if (filterState.typeFilter && !typeMap.has(filterState.typeFilter)) return;
      if (filterState.sizeFilter && !sizeMap.has(filterState.sizeFilter)) return;

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
          sortBy: filterState.sortBy as any,
          sortOrder: 'asc' as const
        };

        const result = await getProducts(filters);

        if (result.success && result.data) {
          setAllProducts(result.data);
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

  // Local filtering by search term using word-split matching
  useEffect(() => {
    if (!filterState.searchTerm) {
      onProductsChange(allProducts);
      return;
    }
    const filtered = allProducts.filter(p => matchesAllWords(p, filterState.searchTerm));
    onProductsChange(filtered);
  }, [filterState.searchTerm, allProducts, onProductsChange]);

  const handleFilterChange = (field: string, value: string) => {
    const newFilterState = { ...filterState, [field]: value };

    if (field === 'tradeFilter') {
      newFilterState.sectionFilter = '';
      newFilterState.categoryFilter = '';
      newFilterState.subcategoryFilter = '';
      newFilterState.typeFilter = '';
      newFilterState.sizeFilter = '';
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
      setTradeOptions(result.data.map(trade => ({ value: trade.id!, label: trade.name })));
    }
    onDataRefresh();
  };

  const handleSizeUpdate = async () => {
    if (currentUser?.uid && filterState.tradeFilter) {
      const result = await getProductSizes(currentUser.uid, filterState.tradeFilter);
      if (result.success && result.data) {
        const map = new Map(result.data.map(size => [size.id!, size.name]));
        setSizeMap(map);
        setSizeOptions(result.data.map(size => ({ value: size.id!, label: size.name })));
      }
    }
    onDataRefresh();
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 space-y-4">
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Dropdown
              value={filterState.tradeFilter}
              onChange={(val) => handleFilterChange('tradeFilter', val)}
              options={[{ value: '', label: 'All Trades' }, ...tradeOptions]}
              placeholder="All Trades"
            />
            <Dropdown
              value={filterState.sectionFilter}
              onChange={(val) => handleFilterChange('sectionFilter', val)}
              options={[{ value: '', label: 'All Sections' }, ...sectionOptions]}
              placeholder="All Sections"
              disabled={!filterState.tradeFilter}
            />
            <Dropdown
              value={filterState.categoryFilter}
              onChange={(val) => handleFilterChange('categoryFilter', val)}
              options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
              placeholder="All Categories"
              disabled={!filterState.sectionFilter}
            />
            <Dropdown
              value={filterState.subcategoryFilter}
              onChange={(val) => handleFilterChange('subcategoryFilter', val)}
              options={[{ value: '', label: 'All Subcategories' }, ...subcategoryOptions]}
              placeholder="All Subcategories"
              disabled={!filterState.categoryFilter}
            />
            <Dropdown
              value={filterState.typeFilter}
              onChange={(val) => handleFilterChange('typeFilter', val)}
              options={[{ value: '', label: 'All Types' }, ...typeOptions]}
              placeholder="All Types"
              disabled={!filterState.subcategoryFilter}
            />
            <Dropdown
              value={filterState.sizeFilter}
              onChange={(val) => handleFilterChange('sizeFilter', val)}
              options={[{ value: '', label: 'All Sizes' }, ...sizeOptions]}
              placeholder="All Sizes"
              disabled={!filterState.tradeFilter}
            />
            <Select
              value={filterState.stockFilter}
              onChange={(val) => handleFilterChange('stockFilter', val)}
              options={stockOptions}
              placeholder="All Stock Levels"
            />
            <Select
              value={filterState.sortBy}
              onChange={(val) => handleFilterChange('sortBy', val)}
              options={sortOptions}
              placeholder="Sort By..."
            />
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

      {showCategoryEditor && (
        <CategoryEditor
          isOpen={showCategoryEditor}
          onClose={() => setShowCategoryEditor(false)}
          onCategoryUpdated={handleCategoryUpdate}
          onBack={() => {
            setShowCategoryEditor(false);
            setShowUtilitiesModal(true);
          }}
        />
      )}

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