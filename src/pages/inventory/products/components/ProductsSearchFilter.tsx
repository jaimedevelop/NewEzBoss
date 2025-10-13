import React, { useState, useEffect } from 'react';
import { Search, MoreVertical } from 'lucide-react';
import CategoryEditor from './CategoryEditor';
import { 
  getProducts,
  type ProductFilters,
  type InventoryProduct
} from '../../../../services/inventory/products';
import { 
  getProductSections,
} from '../../../../services/categories';
import { 
  getProductTrades
} from '../../../../services/categories/trades';
import { 
  getProductCategories
} from '../../../../services/categories/categories';
import {
    getProductSubcategories
} from '../../../../services/categories/subcategories';
import { 
  getProductTypes
} from '../../../../services/categories/productTypes';
import { 
  getProductSizes
} from '../../../../services/categories/sizes';
import {   
  type ProductTrade,
  type ProductSection,
  type ProductCategory,
  type ProductSubcategory,
  type ProductType,
  type ProductSize
} from '../../../../services/categories/types'
import { getLocations } from '../../../../services/inventory/products/locations';
import { useAuthContext } from '../../../../contexts/AuthContext';


interface FilterState {
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
}

interface ProductsSearchFilterProps {
  filterState: FilterState;
  onFilterChange: (filterState: FilterState) => void;
  dataRefreshTrigger?: number;
  onProductsChange?: (products: InventoryProduct[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onErrorChange?: (error: string | null) => void;
  pageSize?: number;
}

const ProductsSearchFilter: React.FC<ProductsSearchFilterProps> = ({
  filterState,
  onFilterChange,
  dataRefreshTrigger = 0,
  onProductsChange,
  onLoadingChange,
  onErrorChange,
  pageSize = 100
}) => {
  const { currentUser } = useAuthContext();
  
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [internalRefreshTrigger, setInternalRefreshTrigger] = useState(0);
  
  // Extract individual filter values from filterState
  const {
    searchTerm,
    tradeFilter,
    sectionFilter,
    categoryFilter,
    subcategoryFilter,
    typeFilter,
    sizeFilter,
    stockFilter,
    locationFilter,
    sortBy
  } = filterState;

  // Data state for filter options
  const [trades, setTrades] = useState<ProductTrade[]>([]);
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // State for tracking selected IDs for hierarchy
  const [selectedTradeId, setSelectedTradeId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

  const stockStatuses = [
    'All Stock',
    'In Stock',
    'Low Stock',
    'Out of Stock'
  ];

  const sortOptions = [
    { value: 'name', label: 'Sort by Name' },
    { value: 'trade', label: 'Trade' },
    { value: 'section', label: 'Section' },
    { value: 'category', label: 'Category' },
    { value: 'size', label: 'Size' },
    { value: 'onHand', label: 'Stock Level' },
    { value: 'unitPrice', label: 'Unit Price' },
    { value: 'lastUpdated', label: 'Last Updated' }
  ];

  // Convert stock filter to appropriate filters
  const getStockFilters = (stockFilter: string) => {
    switch (stockFilter) {
      case 'In Stock':
        return { inStock: true };
      case 'Low Stock':
        return { lowStock: true };
      case 'Out of Stock':
        return { outOfStock: true };
      default:
        return {};
    }
  };

  // Load products when filters change or data refresh is triggered
  useEffect(() => {
    const loadProducts = async () => {
      if (!currentUser?.uid) return;
      
      const isLoading = true;
      setLoading(isLoading);
      onLoadingChange?.(isLoading);
      onErrorChange?.(null);

      try {
        const filters: ProductFilters = {
          trade: tradeFilter || undefined,
          section: sectionFilter || undefined,
          category: categoryFilter || undefined,
          subcategory: subcategoryFilter || undefined,
          type: typeFilter || undefined,
          size: sizeFilter || undefined,
          location: locationFilter || undefined,
          searchTerm: searchTerm || undefined,
          sortBy: sortBy as any,
          sortOrder: 'asc',
          ...getStockFilters(stockFilter)
        };

        // Handle problematic sort fields that might not have Firebase indexes
        const problematicSortFields = ['location', 'supplier', 'size'];
        if (problematicSortFields.includes(sortBy)) {
          console.warn(`Sorting by "${sortBy}" might not have a Firebase index. Consider client-side sorting.`);
          // Use 'name' as fallback for now
          filters.sortBy = 'name';
        }

        const result = await getProducts(filters, pageSize);
        
        if (result.success && result.data) {
          let products = result.data.products;
          
          // Do client-side sorting for fields that don't have Firebase indexes
          if (problematicSortFields.includes(sortBy)) {
            products = products.sort((a, b) => {
              const aValue = a[sortBy as keyof typeof a] || '';
              const bValue = b[sortBy as keyof typeof b] || '';
              return String(aValue).localeCompare(String(bValue));
            });
          }
          
          onProductsChange?.(products);
        } else {
          const error = result.error || 'Failed to load products';
          console.error('Products load error:', error);
          onErrorChange?.(typeof error === 'string' ? error : 'Failed to load products');
          onProductsChange?.([]);
        }
      } catch (err) {
        console.error('Error loading products:', err);
        const error = err instanceof Error ? err.message : 'An error occurred while loading products';
        onErrorChange?.(error);
        onProductsChange?.([]);
      } finally {
        const isLoading = false;
        setLoading(isLoading);
        onLoadingChange?.(isLoading);
      }
    };

    loadProducts();
  }, [
    currentUser?.uid,
    searchTerm,
    tradeFilter,
    sectionFilter,
    categoryFilter,
    subcategoryFilter,
    typeFilter,
    sizeFilter,
    stockFilter,
    locationFilter,
    sortBy,
    pageSize,
    dataRefreshTrigger,
    onProductsChange,
    onLoadingChange,
    onErrorChange
  ]);

  // Load initial data when component mounts or when categories are updated
  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        // Load full trade objects
        const tradesResult = await getProductTrades(currentUser.uid);
        if (tradesResult.success && tradesResult.data) {
          setTrades(tradesResult.data);
          
          // If there's a current tradeFilter, find and set its ID
          if (tradeFilter) {
            const trade = tradesResult.data.find(t => t.name === tradeFilter);
            setSelectedTradeId(trade?.id || '');
          }
        }

        // Load locations
        const locationsResult = await getLocations(currentUser.uid);
        if (locationsResult.success && locationsResult.data) {
          setLocations(locationsResult.data.map(loc => loc.name));
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [currentUser?.uid, tradeFilter, internalRefreshTrigger]); // ADDED: internalRefreshTrigger

  // Load sections when selectedTradeId changes or categories are updated
  useEffect(() => {
    const loadSections = async () => {
      if (!selectedTradeId || !currentUser?.uid) {
        setSections([]);
        return;
      }

      try {
        const result = await getProductSections(selectedTradeId, currentUser.uid);
        if (result.success && result.data) {
          setSections(result.data);
          // If there's a current sectionFilter, find and set its ID
          if (sectionFilter) {
            const section = result.data.find(s => s.name === sectionFilter);
            setSelectedSectionId(section?.id || '');
          }
        } else {
          setSections([]);
        }
      } catch (error) {
        console.error('Error loading sections:', error);
        setSections([]);
      }
    };

    loadSections();
  }, [selectedTradeId, sectionFilter, currentUser?.uid, internalRefreshTrigger]); // ADDED: internalRefreshTrigger

  // Load categories when section changes or categories are updated
  useEffect(() => {
    const loadCategories = async () => {
      if (!selectedSectionId || !currentUser?.uid) {
        setCategories([]);
        return;
      }

      try {
        const result = await getProductCategories(selectedSectionId, currentUser.uid);
        if (result.success && result.data) {
          setCategories(result.data);
          // If there's a current categoryFilter, find and set its ID
          if (categoryFilter) {
            const category = result.data.find(c => c.name === categoryFilter);
            setSelectedCategoryId(category?.id || '');
          }
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      }
    };

    loadCategories();
  }, [selectedSectionId, categoryFilter, currentUser?.uid, internalRefreshTrigger]); // ADDED: internalRefreshTrigger

  // Load subcategories when category changes or categories are updated
  useEffect(() => {
    const loadSubcategories = async () => {
      if (!selectedCategoryId || !currentUser?.uid) {
        setSubcategories([]);
        return;
      }

      try {
        const result = await getProductSubcategories(selectedCategoryId, currentUser.uid);
        if (result.success && result.data) {
          setSubcategories(result.data);
          // If there's a current subcategoryFilter, find and set its ID
          if (subcategoryFilter) {
            const subcategory = result.data.find(s => s.name === subcategoryFilter);
            setSelectedSubcategoryId(subcategory?.id || '');
          }
        } else {
          setSubcategories([]);
        }
      } catch (error) {
        console.error('Error loading subcategories:', error);
        setSubcategories([]);
      }
    };

    loadSubcategories();
  }, [selectedCategoryId, subcategoryFilter, currentUser?.uid, internalRefreshTrigger]); // ADDED: internalRefreshTrigger

  // Load types when subcategory changes or categories are updated
  useEffect(() => {
    const loadTypes = async () => {
      if (!selectedSubcategoryId || !currentUser?.uid) {
        setTypes([]);
        return;
      }

      try {
        const result = await getProductTypes(selectedSubcategoryId, currentUser.uid);
        if (result.success && result.data) {
          setTypes(result.data);
        } else {
          setTypes([]);
        }
      } catch (error) {
        console.error('Error loading types:', error);
        setTypes([]);
      }
    };

    loadTypes();
  }, [selectedSubcategoryId, currentUser?.uid, internalRefreshTrigger]); // ADDED: internalRefreshTrigger

  // Load sizes when selectedTradeId changes or categories are updated
  useEffect(() => {
    const loadSizes = async () => {
      if (!selectedTradeId || !currentUser?.uid) {
        setSizes([]);
        return;
      }

      try {
        const result = await getProductSizes(selectedTradeId, currentUser.uid);
        
        if (result.success && result.data) {
          setSizes(result.data);
        } else {
          setSizes([]);
        }
      } catch (error) {
        console.error('Error loading sizes:', error);
        setSizes([]);
      }
    };

    loadSizes();
  }, [selectedTradeId, currentUser?.uid, internalRefreshTrigger]); // ADDED: internalRefreshTrigger

  // Handle filter changes with dependent filter resets
  const handleTradeChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      tradeFilter: value,
      sectionFilter: '',
      categoryFilter: '',
      subcategoryFilter: '',
      typeFilter: '',
      sizeFilter: ''
    };
    onFilterChange(newFilterState);
    
    // Find and store the selected trade ID
    const selectedTrade = trades.find(t => t.name === value);
    setSelectedTradeId(selectedTrade?.id || '');
    setSelectedSectionId('');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
  };

  const handleSectionChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      sectionFilter: value,
      categoryFilter: '',
      subcategoryFilter: '',
      typeFilter: ''
    };
    onFilterChange(newFilterState);
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    
    // Find the section ID
    const section = sections.find(s => s.name === value);
    setSelectedSectionId(section?.id || '');
  };

  const handleCategoryChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      categoryFilter: value,
      subcategoryFilter: '',
      typeFilter: ''
    };
    onFilterChange(newFilterState);
    setSelectedSubcategoryId('');
    
    // Find the category ID
    const category = categories.find(c => c.name === value);
    setSelectedCategoryId(category?.id || '');
  };

  const handleSubcategoryChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      subcategoryFilter: value,
      typeFilter: ''
    };
    onFilterChange(newFilterState);
    
    // Find the subcategory ID
    const subcategory = subcategories.find(s => s.name === value);
    setSelectedSubcategoryId(subcategory?.id || '');
  };

  const handleTypeChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      typeFilter: value
    };
    onFilterChange(newFilterState);
  };

  const handleSizeChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      sizeFilter: value
    };
    onFilterChange(newFilterState);
  };

  const handleSearchChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      searchTerm: value
    };
    onFilterChange(newFilterState);
  };

  const handleStockChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      stockFilter: value
    };
    onFilterChange(newFilterState);
  };

  const handleLocationChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      locationFilter: value
    };
    onFilterChange(newFilterState);
  };

  const handleSortChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      sortBy: value
    };
    onFilterChange(newFilterState);
  };

  if (loading && trades.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center py-4">
          <div className="text-gray-500">Loading filters...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="space-y-4">
        {/* Search Input with Category Editor Button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name, SKU, or description..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
          </div>
          <button
            onClick={() => setShowCategoryEditor(true)}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap"
            title="Manage Categories"
          >
            <MoreVertical className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Categories</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
          {/* Trade Filter */}
          <select
            value={tradeFilter}
            onChange={(e) => handleTradeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
          >
            <option value="">All Trades</option>
            {trades.map((trade) => (
              <option key={trade.id} value={trade.name}>
                {trade.name}
              </option>
            ))}
          </select>

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => handleSectionChange(e.target.value)}
            disabled={!tradeFilter}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Sections</option>
            {sections.map((section) => (
              <option key={section.id || section.name} value={section.name}>
                {section.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={!sectionFilter}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id || category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Subcategory Filter */}
          <select
            value={subcategoryFilter}
            onChange={(e) => handleSubcategoryChange(e.target.value)}
            disabled={!categoryFilter}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Subcategories</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id || subcategory.name} value={subcategory.name}>
                {subcategory.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => handleTypeChange(e.target.value)}
            disabled={!subcategoryFilter}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Types</option>
            {types.map((type) => (
              <option key={type.id || type.name} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>

          {/* Size Filter */}
          <select
            value={sizeFilter}
            onChange={(e) => handleSizeChange(e.target.value)}
            disabled={!tradeFilter}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Sizes</option>
            {sizes.map((size) => (
              <option key={size.id || size.name} value={size.name}>
                {size.name}
              </option>
            ))}
          </select>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => handleLocationChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
          >
            <option value="">All Locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => handleStockChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
          >
            {stockStatuses.map((status) => (
              <option key={status} value={status === 'All Stock' ? '' : status}>
                {status}
              </option>
            ))}
          </select>

          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Editor Modal */}
      <CategoryEditor
        isOpen={showCategoryEditor}
        onClose={() => setShowCategoryEditor(false)}
        onCategoryUpdated={() => {
          // Trigger a refresh of all filter options
          setInternalRefreshTrigger(prev => prev + 1);
        }}
      />
    </div>
  );
};

export default ProductsSearchFilter;