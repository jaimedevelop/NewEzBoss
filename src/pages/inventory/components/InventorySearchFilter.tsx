import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { 
  getCategoriesForSection, 
  getSubcategoriesForCategory,
  getProducts,
  type ProductFilters,
  type InventoryProduct
} from '../../../services/products';
import { getAllAvailableSections, getAllAvailableProductTypes } from '../../../services/productCategories';
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
  
  // Internal filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Data state for filter options
  const [sections, setSections] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const stockStatuses = [
    'All Stock',
    'In Stock',
    'Low Stock',
    'Out of Stock'
  ];

  const sortOptions = [
    { value: 'name', label: 'Sort by Name' },
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

        const result = await getProducts(filters, pageSize);
        
        if (result.success && result.data) {
          onProductsChange?.(result.data.products);
        } else {
          const error = result.error || 'Failed to load products';
          onErrorChange?.(error);
          onProductsChange?.([]);
        }
      } catch (err) {
        console.error('Error loading products:', err);
        const error = 'An error occurred while loading products';
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
        // Load sections
        const sectionsResult = await getAllAvailableSections(currentUser.uid);
        if (sectionsResult.success && sectionsResult.data) {
          setSections(sectionsResult.data);
        }

        // Load product types
        const typesResult = await getAllAvailableProductTypes(currentUser.uid);
        if (typesResult.success && typesResult.data) {
          setProductTypes(typesResult.data);
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

  // Load categories when section changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!sectionFilter) {
        setCategories([]);
        return;
      }

      try {
        const result = await getCategoriesForSection(sectionFilter);
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
  }, [sectionFilter]);

  // Load subcategories when category changes
  useEffect(() => {
    const loadSubcategories = async () => {
      if (!sectionFilter || !categoryFilter) {
        setSubcategories([]);
        return;
      }

      try {
        const result = await getSubcategoriesForCategory(sectionFilter, categoryFilter);
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
  }, [sectionFilter, categoryFilter]);

  // Handle filter changes with dependent filter resets
  const handleSectionChange = (value: string) => {
    setSectionFilter(value);
    setCategoryFilter('');
    setSubcategoryFilter('');
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setSubcategoryFilter('');
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSubcategoryChange = (value: string) => {
    setSubcategoryFilter(value);
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

  if (loading && sections.length === 0) {
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

        {/* Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => handleSectionChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
          >
            <option value="">All Sections</option>
            {sections.map((section) => (
              <option key={section} value={section}>
                {section}
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
              <option key={category} value={category}>
                {category}
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
              <option key={subcategory} value={subcategory}>
                {subcategory}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
          >
            <option value="">All Types</option>
            {productTypes.map((type) => (
              <option key={type} value={type}>
                {type}
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