// src/pages/inventory/tools/components/ToolsSearchFilter.tsx
import React, { useState, useEffect } from 'react';
import { Search, FolderTree } from 'lucide-react';
import ToolCategoryEditor from './ToolCategoryEditor';
import { 
  getTools,
  type ToolFilters,
  type ToolItem
} from '../../../../services/inventory/tools';
import { 
  getProductTrades,
  type ProductTrade
} from '../../../../services/categories/trades';
import { 
  getToolSections
} from '../../../../services/inventory/tools/sections';
import { 
  getToolCategories
} from '../../../../services/inventory/tools/categories';
import {
  getToolSubcategories
} from '../../../../services/inventory/tools/subcategories';
import {
  type ToolSection, ToolCategory, ToolSubcategory
} from '../../../../services/inventory/tools/tool.types';
import { useAuthContext } from '../../../../contexts/AuthContext';

interface FilterState {
  searchTerm: string;
  tradeFilter: string;      // Stores tradeId
  sectionFilter: string;    // Stores sectionId
  categoryFilter: string;   // Stores categoryId
  subcategoryFilter: string; // Stores subcategoryId
  statusFilter: string;
  sortBy: string;
}

interface ToolsSearchFilterProps {
  filterState: FilterState;
  onFilterChange: (filterState: FilterState) => void;
  dataRefreshTrigger?: number;
  onToolsChange?: (tools: ToolItem[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onErrorChange?: (error: string | null) => void;
  pageSize?: number;
}

const ToolsSearchFilter: React.FC<ToolsSearchFilterProps> = ({
  filterState,
  onFilterChange,
  dataRefreshTrigger = 0,
  onToolsChange,
  onLoadingChange,
  onErrorChange,
  pageSize = 100
}) => {
  const { currentUser } = useAuthContext();
  
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);

  const [internalRefreshTrigger, setInternalRefreshTrigger] = useState(0);
  
  const {
    searchTerm,
    tradeFilter,
    sectionFilter,
    categoryFilter,
    subcategoryFilter,
    statusFilter,
    sortBy
  } = filterState;

  // Data state for filter options
  const [trades, setTrades] = useState<ProductTrade[]>([]);
  const [sections, setSections] = useState<ToolSection[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ToolSubcategory[]>([]);
  const [loading, setLoading] = useState(true);

  const statusOptions = [
    'All Status',
    'Available',
    'In Use',
    'Maintenance'
  ];

  const sortOptions = [
    { value: 'name', label: 'Sort by Name' },
    { value: 'brand', label: 'Brand' },
    { value: 'minimumCustomerCharge', label: 'Min Charge' },
    { value: 'purchaseDate', label: 'Purchase Date' },
    { value: 'status', label: 'Status' }
  ];

  // Load tools when filters change or data refresh is triggered
  useEffect(() => {
    const loadTools = async () => {
      if (!currentUser?.uid) return;
      
      const isLoading = true;
      setLoading(isLoading);
      onLoadingChange?.(isLoading);
      onErrorChange?.(null);

      try {
        const filters: ToolFilters = {
          tradeId: tradeFilter || undefined,
          sectionId: sectionFilter || undefined,
          categoryId: categoryFilter || undefined,
          subcategoryId: subcategoryFilter || undefined,
          status: statusFilter && statusFilter !== 'All Status' ? statusFilter.toLowerCase().replace(' ', '-') : undefined,
          searchTerm: searchTerm || undefined,
          sortBy: sortBy as any,
          sortOrder: 'asc'
        };

        const result = await getTools(currentUser.uid, filters, pageSize);
        
        if (result.success && result.data) {
          onToolsChange?.(result.data.tools);
        } else {
          const error = result.error || 'Failed to load tools';
          console.error('Tools load error:', error);
          onErrorChange?.(typeof error === 'string' ? error : 'Failed to load tools');
          onToolsChange?.([]);
        }
      } catch (err) {
        console.error('Error loading tools:', err);
        const error = err instanceof Error ? err.message : 'An error occurred while loading tools';
        onErrorChange?.(error);
        onToolsChange?.([]);
      } finally {
        const isLoading = false;
        setLoading(isLoading);
        onLoadingChange?.(isLoading);
      }
    };

    loadTools();
  }, [
    currentUser?.uid,
    searchTerm,
    tradeFilter,
    sectionFilter,
    categoryFilter,
    subcategoryFilter,
    statusFilter,
    sortBy,
    pageSize,
    dataRefreshTrigger,
    onToolsChange,
    onLoadingChange,
    onErrorChange
  ]);

  // Load initial data when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        // Load trades
        const tradesResult = await getProductTrades(currentUser.uid);
        if (tradesResult.success && tradesResult.data) {
          setTrades(tradesResult.data);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [currentUser?.uid, internalRefreshTrigger]);

  // Load sections when tradeFilter changes
  useEffect(() => {
    const loadSections = async () => {
      if (!tradeFilter || !currentUser?.uid) {
        setSections([]);
        return;
      }

      try {
        const result = await getToolSections(tradeFilter, currentUser.uid);
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
  }, [tradeFilter, currentUser?.uid, internalRefreshTrigger]);

  // Load categories when sectionFilter changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!sectionFilter || !currentUser?.uid) {
        setCategories([]);
        return;
      }

      try {
        const result = await getToolCategories(sectionFilter, currentUser.uid);
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
  }, [sectionFilter, currentUser?.uid, internalRefreshTrigger]);

  // Load subcategories when categoryFilter changes
  useEffect(() => {
    const loadSubcategories = async () => {
      if (!categoryFilter || !currentUser?.uid) {
        setSubcategories([]);
        return;
      }

      try {
        const result = await getToolSubcategories(categoryFilter, currentUser.uid);
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
  }, [categoryFilter, currentUser?.uid, internalRefreshTrigger]);

  // ✅ FIXED: Store IDs in filter state
  const handleTradeChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      tradeFilter: value,  // Store ID
      sectionFilter: '',
      categoryFilter: '',
      subcategoryFilter: ''
    };
    onFilterChange(newFilterState);
    
    setCategories([]);
    setSubcategories([]);
  };

  const handleSectionChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      sectionFilter: value,  // Store ID
      categoryFilter: '',
      subcategoryFilter: ''
    };
    onFilterChange(newFilterState);
  };

  const handleCategoryChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      categoryFilter: value,  // Store ID
      subcategoryFilter: ''
    };
    onFilterChange(newFilterState);
  };

  const handleSubcategoryChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      subcategoryFilter: value  // Store ID
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

  const handleStatusChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      statusFilter: value
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
        {/* Search Input */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tools by name, description, notes, or brand..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>
        
                {/* Manage Categories Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowCategoryEditor(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <FolderTree className="h-4 w-4" />
            Manage Categories
          </button>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* ✅ FIXED: Trade Filter - Use ID as value, display name as label */}
          <select
            value={tradeFilter}
            onChange={(e) => handleTradeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
          >
            <option value="">All Trades</option>
            {trades.map((trade) => (
              <option key={trade.id} value={trade.id}>
                {trade.name}
              </option>
            ))}
          </select>

          {/* ✅ FIXED: Section Filter - Use ID as value, display name as label */}
          <select
            value={sectionFilter}
            onChange={(e) => handleSectionChange(e.target.value)}
            disabled={!tradeFilter}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>

          {/* ✅ FIXED: Category Filter - Use ID as value, display name as label */}
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={!sectionFilter}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* ✅ FIXED: Subcategory Filter - Use ID as value, display name as label */}
          <select
            value={subcategoryFilter}
            onChange={(e) => handleSubcategoryChange(e.target.value)}
            disabled={!categoryFilter}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Subcategories</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status === 'All Status' ? '' : status}>
                {status}
              </option>
            ))}
          </select>

          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
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
      {showCategoryEditor && (
        <ToolCategoryEditor
          isOpen={showCategoryEditor}
          onClose={() => setShowCategoryEditor(false)}
          onCategoryUpdated={() => {
            setInternalRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
};

export default ToolsSearchFilter;