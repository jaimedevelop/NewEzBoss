import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { 
  getProducts,
  type ProductFilters,
  type InventoryProduct
} from '../../../services/products';
import { 
  getAllAvailableTrades,
  getProductSections,
  getProductCategories,
  getProductSubcategories,
  getProductTypes
} from '../../../services/productCategories';
import { getLocations } from '../../../services/locations';
import { useAuthContext } from '../../../contexts/AuthContext';

interface InventorySearchFilterProps {
  onProductsChange?: (products: InventoryProduct[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onErrorChange?: (error: string | null) => void;
  pageSize?: number;
}

const InventorySearchFilter: React.FC<InventorySearchFilterProps> = ({
  onProductsChange,
  onLoadingChange,
  onErrorChange,
  pageSize = 100
}) => {
  const { currentUser } = useAuthContext();
  
  // Internal filter state - Updated for Trade hierarchy
  const [searchTerm, setSearchTerm] = useState('');
  const [tradeFilter, setTradeFilter] = useState(''); // NEW
  const [sectionFilter, setSectionFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Data state for filter options - Updated for Trade hierarchy
  const [trades, setTrades] = useState<string[]>([]); // NEW
  const [sections, setSections] = useState<{ id?: string; name: string; }[]>([]);
  const [categories, setCategories] = useState<{ id?: string; name: string; }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id?: string; name: string; }[]>([]);
  const [types, setTypes] = useState<{ id?: string; name: string; }[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // State for tracking selected IDs for hierarchy
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
    { value: 'trade', label: 'Trade' }, // NEW
    { value: 'section', label: 'Section' },
    { value: 'category', label: 'Category' },
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

  // Load products when filters change
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
          location: locationFilter || undefined,
          searchTerm: searchTerm || undefined,
          sortBy: sortBy as any,
          sortOrder: 'asc',
          ...getStockFilters(stockFilter)
        };

        // Handle problematic sort fields that might not have Firebase indexes
        const problematicSortFields = ['location', 'supplier'];
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
    stockFilter,
    locationFilter,
    sortBy,
    pageSize,
    onProductsChange,
    onLoadingChange,
    onErrorChange
  ]);

  // Load initial data when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        // Load trades
        const tradesResult = await getAllAvailableTrades(currentUser.uid);
        if (tradesResult.success && tradesResult.data) {
          setTrades(tradesResult.data);
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
  }, [currentUser?.uid]);

  // Load sections when trade changes
  useEffect(() => {
    const loadSections = async () => {
      if (!tradeFilter || !currentUser?.uid) {
        setSections([]);
        return;
      }

      try {
        const result = await getProductSections(tradeFilter, currentUser.uid);
        if (result.success && result.data) {
          setSections(result.data);
        } else {
          setSections([]);
        }
      } catch (error) {
        console.error('Error loading sections:', error);
        setSections([]);
      }
    };

    loadSections();
  }, [tradeFilter, currentUser?.uid]);

  // Load categories when section changes
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
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      }
    };

    loadCategories();
  }, [selectedSectionId, currentUser?.uid]);

  // Load subcategories when category changes
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
        } else {
          setSubcategories([]);
        }
      } catch (error) {
        console.error('Error loading subcategories:', error);
        setSubcategories([]);
      }
    };

    loadSubcategories();
  }, [selectedCategoryId, currentUser?.uid]);

  // Load types when subcategory changes
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
  }, [selectedSubcategoryId, currentUser?.uid]);

  // Handle filter changes with dependent filter resets
  const handleTradeChange = (value: string) => {
    setTradeFilter(value);
    setSectionFilter('');
    setCategoryFilter('');
    setSubcategoryFilter('');
    setTypeFilter('');
    setSelectedSectionId('');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
  };

  const handleSectionChange = (value: string) => {
    setSectionFilter(value);
    setCategoryFilter('');
    setSubcategoryFilter('');
    setTypeFilter('');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    
    // Find the section ID
    const section = sections.find(s => s.name === value);
    setSelectedSectionId(section?.id || '');
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setSubcategoryFilter('');
    setTypeFilter('');
    setSelectedSubcategoryId('');
    
    // Find the category ID
    const category = categories.find(c => c.name === value);
    setSelectedCategoryId(category?.id || '');
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSubcategoryChange = (value: string) => {
    setSubcategoryFilter(value);
    setTypeFilter(''); // Clear type when subcategory changes
    
    // Find the subcategory ID
    const subcategory = subcategories.find(s => s.name === value);
    setSelectedSubcategoryId(subcategory?.id || '');
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
  };

  const handleStockChange = (value: string) => {
    setStockFilter(value);
  };

  const handleLocationChange = (value: string) => {
    setLocationFilter(value);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
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
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name, SKU, or description..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
          />
        </div>

        {/* Filters Row - Updated with Trade hierarchy */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-3">
          {/* Trade Filter - NEW */}
          <select
            value={tradeFilter}
            onChange={(e) => handleTradeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
          >
            <option value="">All Trades</option>
            {trades.map((trade) => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </select>

          {/* Section Filter - Now depends on Trade */}
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

          {/* Category Filter - Now depends on Section */}
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

          {/* Type Filter - Now part of hierarchy */}
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
    </div>
  );
};

export default InventorySearchFilter;