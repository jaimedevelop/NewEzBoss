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
  getProductTypes
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
      filterState.stockFilter
    );
  }, [
    filterState.searchTerm,
    filterState.tradeFilter,
    filterState.sectionFilter,
    filterState.categoryFilter,
    filterState.subcategoryFilter,
    filterState.typeFilter,
    filterState.stockFilter
  ]);

  // Store ID-to-name mappings for display
  const [tradeMap, setTradeMap] = useState<Map<string, string>>(new Map());
  const [sectionMap, setSectionMap] = useState<Map<string, string>>(new Map());
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [subcategoryMap, setSubcategoryMap] = useState<Map<string, string>>(new Map());
  const [typeMap, setTypeMap] = useState<Map<string, string>>(new Map());

  // Dropdown options (now using IDs as values)
  const [tradeOptions, setTradeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [sectionOptions, setSectionOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [typeOptions, setTypeOptions] = useState<Array<{ value: string; label: string }>>([]);

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

  // Load products when filters change
  useEffect(() => {
    const loadProducts = async () => {
      onLoadingChange(true);
      onErrorChange(null);

      try {
        const filters = {
          trade: filterState.tradeFilter ? tradeMap.get(filterState.tradeFilter) : undefined,
          section: filterState.sectionFilter ? sectionMap.get(filterState.sectionFilter) : undefined,
          category: filterState.categoryFilter ? categoryMap.get(filterState.categoryFilter) : undefined,
          subcategory: filterState.subcategoryFilter ? subcategoryMap.get(filterState.subcategoryFilter) : undefined,
          type: filterState.typeFilter ? typeMap.get(filterState.typeFilter) : undefined,
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
    filterState.searchTerm,
    filterState.stockFilter,
    filterState.sortBy,
    dataRefreshTrigger,
    tradeMap,
    sectionMap,
    categoryMap,
    subcategoryMap,
    typeMap
  ]);

  const handleFilterChange = (field: string, value: string) => {
    const newFilterState = { ...filterState, [field]: value };

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

  // Reload dropdown data when categories are updated (keeps modal open)
  const handleCategoryUpdate = async () => {
    if (!currentUser?.uid) return;
    
    // Reload trades to refresh the dropdown
    const result = await getProductTrades(currentUser.uid);
    if (result.success && result.data) {
      const map = new Map(result.data.map(trade => [trade.id!, trade.name]));
      setTradeMap(map);
      setTradeOptions(result.data.map(trade => ({
        value: trade.id!,
        label: trade.name
      })));
    }
    
    // Trigger refresh of products list
    onDataRefresh();
  };

  // Close the category editor modal
  const handleCategoryEditorClose = () => {
    setShowCategoryEditor(false);
  };

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