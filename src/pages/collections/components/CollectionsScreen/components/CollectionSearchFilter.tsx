// src/pages/collections/components/CollectionsScreen/components/CollectionSearchFilter.tsx
import React from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterState {
  searchTerm: string;
  sizeFilter: string;
  stockFilter: string;
  locationFilter: string;
}

interface CollectionSearchFilterProps {
  filterState: FilterState;
  onFilterChange: (filterState: FilterState) => void;
  availableSizes: string[];
  availableLocations: string[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMasterTab?: boolean; // Show only search on Master tab
}

const CollectionSearchFilter: React.FC<CollectionSearchFilterProps> = ({
  filterState,
  onFilterChange,
  availableSizes,
  availableLocations,
  isCollapsed,
  onToggleCollapse,
  isMasterTab = false,
}) => {
  const { searchTerm, sizeFilter, stockFilter, locationFilter } = filterState;

  const stockStatuses = [
    'All Stock',
    'In Stock',
    'Low Stock',
    'Out of Stock'
  ];

  // Count active filters (excluding search, and only count dropdowns if not on Master tab)
  const activeFilterCount = isMasterTab 
    ? 0 
    : [sizeFilter, stockFilter, locationFilter].filter(Boolean).length;

  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filterState, searchTerm: value });
  };

  const handleSizeChange = (value: string) => {
    onFilterChange({ ...filterState, sizeFilter: value });
  };

  const handleStockChange = (value: string) => {
    onFilterChange({ ...filterState, stockFilter: value });
  };

  const handleLocationChange = (value: string) => {
    onFilterChange({ ...filterState, locationFilter: value });
  };

  const handleClearAll = () => {
    onFilterChange({
      searchTerm: '',
      sizeFilter: '',
      stockFilter: '',
      locationFilter: '',
    });
  };

  const hasAnyFilter = searchTerm || sizeFilter || stockFilter || locationFilter;

  // Show clear button on Master tab if search is active
  const showClearOnMaster = isMasterTab && searchTerm;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Collapsed State */}
      {isCollapsed ? (
        <div className="px-6 py-3">
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold text-orange-800 bg-orange-100 rounded-full">
                    {activeFilterCount} active
                  </span>
                )}
              </span>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      ) : (
        /* Expanded State */
        <div className="px-6 py-4 space-y-3">
          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or description..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Clear All on Master Tab (if search active) */}
            {showClearOnMaster && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Clear
              </button>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Collapse Filters"
            >
              <ChevronUp className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Filter Dropdowns - Only show on Category Tabs */}
          {!isMasterTab && (
            <div className="flex items-center gap-3">
              {/* Size Filter */}
              <select
                value={sizeFilter}
                onChange={(e) => handleSizeChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
              >
                <option value="">All Sizes</option>
                {availableSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
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

              {/* Location Filter */}
              <select
                value={locationFilter}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
              >
                <option value="">All Locations</option>
                {availableLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>

              {/* Clear All Button */}
              {hasAnyFilter && (
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Clear All
                </button>
              )}

              {/* Spacer */}
              <div className="flex-1" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionSearchFilter;