// src/pages/collections/components/CollectionsScreen/components/ProductsHeader.tsx
import React from 'react';
import { Search, Filter } from 'lucide-react';

interface ProductsHeaderProps {
  totalProducts: number;
  selectedCount: number;
  searchQuery: string;
  isEditing: boolean;
  onSearchChange: (query: string) => void;
}

const ProductsHeader: React.FC<ProductsHeaderProps> = ({
  totalProducts,
  selectedCount,
  searchQuery,
  isEditing,
  onSearchChange,
}) => {
  return (
    <div className="px-6 py-3 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Products ({totalProducts})
          {selectedCount > 0 && (
            <span className="ml-2 text-sm text-orange-600">
              ({selectedCount} selected)
            </span>
          )}
        </h2>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          
          {isEditing && (
            <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsHeader;