// src/pages/products/components/ProductsSearchFilter.tsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, Settings } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { getProducts, type InventoryProduct } from '../../../../services';
import { 
  getProductTrades,
  getProductSections,
  getProductCategories,
  getProductSubcategories,
  getProductTypes
} from '../../../../services/categories';

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
  onProductsChange: (products: InventoryProduct[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onErrorChange: (error: string | null) => void;
}

const ProductsSearchFilter: React.FC<ProductsSearchFilterProps> = ({
  filterState,
  onFilterChange,
  dataRefreshTrigger,
  onProductsChange,
  onLoadingChange,
  onErrorChange
}) => {
  const { currentUser } = useAuthContext();

  // Dropdown options
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
        setTradeOptions(result.data.map(trade => ({
          value: trade.name,
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
      
      const result = await getProductSections(currentUser.uid, filterState.tradeFilter);
      if (result.success && result.data) {
        setSectionOptions(result.data.map(section => ({
          value: section.name,
          label: section.name
        })));
      }
    };
    
    loadSections();
  }, [currentUser?.uid, filterState.tradeFilter]);

  // Load categories when section changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!currentUser?.uid || !filterState.tradeFilter || !filterState.sectionFilter) {
        setCategoryOptions([]);
        return;
      }
      
      const result = await getProductCategories(currentUser.uid, filterState.tradeFilter, filterState.sectionFilter);
      if (result.success && result.data) {
        setCategoryOptions(result.data.map(category => ({
          value: category.name,
          label: category.name
        })));
      }
    };
    
    loadCategories();
  }, [currentUser?.uid, filterState.tradeFilter, filterState.sectionFilter]);

  // Load subcategories when category changes
  useEffect(() => {
    const loadSubcategories = async () => {
      if (!currentUser?.uid || !filterState.tradeFilter || !filterState.sectionFilter || !filterState.categoryFilter) {
        setSubcategoryOptions([]);
        return;
      }
      
      const result = await getProductSubcategories(
        currentUser.uid,
        filterState.tradeFilter,
        filterState.sectionFilter,
        filterState.categoryFilter
      );
      if (result.success && result.data) {
        setSubcategoryOptions(result.data.map(subcategory => ({
          value: subcategory.name,
          label: subcategory.name
        })));
      }
    };
    
    loadSubcategories();
  }, [currentUser?.uid, filterState.tradeFilter, filterState.sectionFilter, filterState.categoryFilter]);

  // Load types when subcategory changes
  useEffect(() => {
    const loadTypes = async () => {
      if (!currentUser?.uid || !filterState.tradeFilter || !filterState.sectionFilter || 
          !filterState.categoryFilter || !filterState.subcategoryFilter) {
        setTypeOptions([]);
        return;
      }
      
      const result = await getProductTypes(
        currentUser.uid,
        filterState.tradeFilter,
        filterState.sectionFilter,
        filterState.categoryFilter,
        filterState.subcategoryFilter
      );
      if (result.success && result.data) {
        setTypeOptions(result.data.map(type => ({
          value: type.name,
          label: type.name
        })));
      }
    };
    
    loadTypes();
  }, [currentUser?.uid, filterState.tradeFilter, filterState.sectionFilter, 
      filterState.categoryFilter, filterState.subcategoryFilter]);

  // Load products when filters change
  useEffect(() => {
    const loadProducts = async () => {
      onLoadingChange(true);
      onErrorChange(null);

      try {
        const filters = {
          trade: filterState.tradeFilter || undefined,
          section: filterState.sectionFilter || undefined,
          category: filterState.categoryFilter || undefined,
          subcategory: filterState.subcategoryFilter || undefined,
          type: filterState.typeFilter || undefined,
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
    dataRefreshTrigger
  ]);

  const handleFilterChange = (field: string, value: string) => {
    const newFilterState = { ...filterState, [field]: value };

    // Reset dependent filters when parent changes
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filter Products</h3>
          </div>
          <button
            onClick={handleClearFilters}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={filterState.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

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
        </div>
      </div>
    </div>
  );
};

export default ProductsSearchFilter;