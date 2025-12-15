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
}

const ProductsSearchFilter: React.FC<ProductsSearchFilterProps> = ({
  filterState,
  onFilterChange,
  dataRefreshTrigger,
  onDataRefresh,
  onProductsChange,
  onLoadingChange,
  onErrorChange
}) => {
  const { currentUser } = useAuthContext();

  console.log('🔍 [FILTER] Component rendered with currentUser:', currentUser?.uid);

  // Category editor state
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);

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

  // ✅ Load ALL sizes on mount (no tradeId needed for single-trade client)
  useEffect(() => {
    console.log('🔍 [FILTER] Size loading effect triggered');
    console.log('🔍 [FILTER] currentUser?.uid:', currentUser?.uid);
    
    const loadSizes = async () => {
      if (!currentUser?.uid) {
        console.log('⚠️ [FILTER] No user ID, skipping size load');
        return;
      }
      
      console.log('🔍 [FILTER] Starting size load for user:', currentUser.uid);
      
      try {
        // Load all sizes for this user (tradeId optional)
        const result = await getProductSizes(currentUser.uid);
        
        console.log('🔍 [FILTER] getProductSizes result:', {
          success: result.success,
          dataLength: result.data?.length,
          data: result.data,
          error: result.error
        });
        
        if (result.success && result.data) {
          console.log('🔍 [FILTER] Processing sizes data:', result.data);
          
          const map = new Map(result.data.map(size => {
            console.log('🔍 [FILTER] Mapping size:', { id: size.id, name: size.name });
            return [size.id!, size.name];
          }));
          
          console.log('🔍 [FILTER] Created sizeMap:', map);
          setSizeMap(map);
          
          const options = result.data.map(size => ({
            value: size.id!,
            label: size.name
          }));
          
          console.log('🔍 [FILTER] Created sizeOptions:', options);
          setSizeOptions(options);
          
          console.log('✅ [FILTER] Size loading complete. Options count:', options.length);
        } else {
          console.log('⚠️ [FILTER] Size loading failed or returned no data');
        }
      } catch (error) {
        console.error('❌ [FILTER] Error loading sizes:', error);
      }
    };
    
    loadSizes();
  }, [currentUser?.uid]);

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
        lowStock: filterState.stockFilter === 'low',
        outOfStock: filterState.stockFilter === 'out',
        inStock: filterState.stockFilter === 'in',
        sortBy: filterState.sortBy as any,
        sortOrder: 'asc' as const
      };

      const result = await getProducts(filters);

      if (result.success && result.data) {
        onProductsChange(result.data);
      } else {
        onErrorChange(result.error?.toString() || 'Failed to load products');
        onProductsChange([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      onErrorChange('An error occurred while loading products');
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
  filterState.searchTerm,
  filterState.stockFilter,
  filterState.sortBy,
  dataRefreshTrigger
  // ✅ Maps removed from dependencies
]);

  const handleFilterChange = (field: string, value: string) => {
    const newFilterState = { ...filterState, [field]: value };

    // Cascading resets for hierarchy - DON'T reset sizeFilter (it's independent)
    if (field === 'tradeFilter') {
      newFilterState.sectionFilter = '';
      newFilterState.categoryFilter = '';
      newFilterState.subcategoryFilter = '';
      newFilterState.typeFilter = '';
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

  const handleCategoryEditorClose = () => {
    setShowCategoryEditor(false);
  };

  console.log('🔍 [FILTER] About to render. sizeOptions:', sizeOptions);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
              onClick={() => setShowCategoryEditor(true)}
              className="flex items-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Settings className="h-5 w-5" />
              Manage Categories
            </button>
          </div>

          {/* Bottom Row - Filter Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Trade */}
            <select
              value={filterState.tradeFilter}
              onChange={(e) => handleFilterChange('tradeFilter', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Trades</option>
              {tradeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* Section */}
            <select
              value={filterState.sectionFilter}
              onChange={(e) => handleFilterChange('sectionFilter', e.target.value)}
              disabled={!filterState.tradeFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">All Sections</option>
              {sectionOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* Category */}
            <select
              value={filterState.categoryFilter}
              onChange={(e) => handleFilterChange('categoryFilter', e.target.value)}
              disabled={!filterState.sectionFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">All Categories</option>
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* Subcategory */}
            <select
              value={filterState.subcategoryFilter}
              onChange={(e) => handleFilterChange('subcategoryFilter', e.target.value)}
              disabled={!filterState.categoryFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">All Subcategories</option>
              {subcategoryOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* Type */}
            <select
              value={filterState.typeFilter}
              onChange={(e) => handleFilterChange('typeFilter', e.target.value)}
              disabled={!filterState.subcategoryFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">All Types</option>
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* ✅ Size - Always Available */}
            <select
              value={filterState.sizeFilter}
              onChange={(e) => {
                console.log('🔍 [FILTER] Size dropdown changed to:', e.target.value);
                handleFilterChange('sizeFilter', e.target.value);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Sizes</option>
              {sizeOptions.map(option => {
                console.log('🔍 [FILTER] Rendering size option:', option);
                return (
                  <option key={option.value} value={option.value}>{option.label}</option>
                );
              })}
            </select>

            {/* Stock Filter */}
            <select
              value={filterState.stockFilter}
              onChange={(e) => handleFilterChange('stockFilter', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Stock Levels</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>

            {/* Sort By */}
            <select
              value={filterState.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="trade">Sort by Trade</option>
              <option value="unitPrice">Sort by Price</option>
              <option value="onHand">Sort by Stock</option>
            </select>

            {/* Clear All Button */}
            <button
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className={`px-4 py-2 border-2 rounded-lg font-medium transition-colors ${
                hasActiveFilters
                  ? 'border-orange-600 text-orange-600 hover:bg-orange-50 cursor-pointer'
                  : 'border-gray-300 text-gray-400 cursor-not-allowed'
              }`}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Category Editor Modal */}
      {showCategoryEditor && (
        <CategoryEditor
          isOpen={showCategoryEditor}
          onClose={handleCategoryEditorClose}
          onCategoryUpdated={handleCategoryUpdate}
        />
      )}
    </>
  );
};

export default ProductsSearchFilter;