import React from 'react';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';

interface InventorySearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  stockFilter: string;
  onStockFilterChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

const InventorySearchFilter: React.FC<InventorySearchFilterProps> = ({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  typeFilter,
  onTypeFilterChange,
  stockFilter,
  onStockFilterChange,
  sortBy,
  onSortChange
}) => {
  const categories = [
    'All Categories',
    'Plumbing',
    'Electrical',
    'HVAC',
    'Concrete & Masonry',
    'Lumber & Building Materials',
    'Tools & Equipment',
    'Safety & PPE',
    'Hardware & Fasteners'
  ];

  const productTypes = [
    'All Types',
    'Material',
    'Tool',
    'Equipment',
    'Rental',
    'Consumable',
    'Safety'
  ];

  const stockStatuses = [
    'All Stock',
    'In Stock',
    'Low Stock',
    'Out of Stock',
    'On Order'
  ];

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
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
          >
            {categories.map((category) => (
              <option key={category} value={category === 'All Categories' ? '' : category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
          >
            {productTypes.map((type) => (
              <option key={type} value={type === 'All Types' ? '' : type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => onStockFilterChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
          >
            {stockStatuses.map((status) => (
              <option key={status} value={status === 'All Stock' ? '' : status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm"
          >
            <option value="name">Sort by Name</option>
            <option value="category">Category</option>
            <option value="stock">Stock Level</option>
            <option value="value">Value</option>
            <option value="lastUpdated">Last Updated</option>
          </select>

          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 text-sm">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Advanced</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventorySearchFilter;