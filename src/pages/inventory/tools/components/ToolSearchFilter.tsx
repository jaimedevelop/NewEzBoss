// src/pages/inventory/tools/components/ToolSearchFilter.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Settings } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { 
  getTools, 
  getToolSections,
  getToolCategories,
  getToolSubcategories,
  type ToolItem 
} from '../../../../services/inventory/tools';
import { getProductTrades } from '../../../../services/categories';
import ToolCategoryEditor from './ToolCategoryEditor';

interface ToolsSearchFilterProps {
  filterState: {
    searchTerm: string;
    tradeFilter: string;
    sectionFilter: string;
    categoryFilter: string;
    subcategoryFilter: string;
    statusFilter: string;
    sortBy: string;
  };
  onFilterChange: (filterState: any) => void;
  dataRefreshTrigger: number;
  onToolsChange: (tools: ToolItem[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onErrorChange: (error: string | null) => void;
  onCategoryUpdated: () => void;
}

const ToolsSearchFilter: React.FC<ToolsSearchFilterProps> = ({
  filterState,
  onFilterChange,
  dataRefreshTrigger,
  onToolsChange,
  onLoadingChange,
  onErrorChange,
  onCategoryUpdated
}) => {
  const { currentUser } = useAuthContext();

  // Check if any filters are active (excluding sortBy which always has a value)
  const hasActiveFilters = useMemo(() => {
    return !!(
      filterState.searchTerm ||
      filterState.tradeFilter ||
      filterState.sectionFilter ||
      filterState.categoryFilter ||
      filterState.subcategoryFilter ||
      filterState.statusFilter
    );
  }, [
    filterState.searchTerm,
    filterState.tradeFilter,
    filterState.sectionFilter,
    filterState.categoryFilter,
    filterState.subcategoryFilter,
    filterState.statusFilter
  ]);

  const [showCategoryEditor, setShowCategoryEditor] = useState(false);

  const [tradeOptions, setTradeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [sectionOptions, setSectionOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Load trades on mount
  useEffect(() => {
    const loadTrades = async () => {
      if (!currentUser?.uid) return;
      
      const result = await getProductTrades(currentUser.uid);
      if (result.success && result.data) {
        setTradeOptions(result.data.map(trade => ({
          value: trade.id || '',
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
      
      const result = await getToolSections(filterState.tradeFilter, currentUser.uid);
      if (result.success && result.data) {
        setSectionOptions(result.data.map(section => ({
          value: section.id || '',
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
      
      const result = await getToolCategories(filterState.sectionFilter, currentUser.uid);
      if (result.success && result.data) {
        setCategoryOptions(result.data.map(category => ({
          value: category.id || '',
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
      
      const result = await getToolSubcategories(filterState.categoryFilter, currentUser.uid);
      if (result.success && result.data) {
        setSubcategoryOptions(result.data.map(subcategory => ({
          value: subcategory.id || '',
          label: subcategory.name
        })));
      }
    };
    
    loadSubcategories();
  }, [currentUser?.uid, filterState.categoryFilter]);

  // Load tools when filters change
  useEffect(() => {
    const loadTools = async () => {
      if (!currentUser?.uid) return;

      onLoadingChange(true);
      onErrorChange(null);

      try {
        const filters = {
          tradeId: filterState.tradeFilter || undefined,
          sectionId: filterState.sectionFilter || undefined,
          categoryId: filterState.categoryFilter || undefined,
          subcategoryId: filterState.subcategoryFilter || undefined,
          status: filterState.statusFilter || undefined,
          searchTerm: filterState.searchTerm || undefined,
          sortBy: filterState.sortBy as any,
          sortOrder: 'asc' as const
        };

        const result = await getTools(currentUser.uid, filters);

        if (result.success && result.data) {
          onToolsChange(result.data);
        } else {
          onErrorChange(result.error || 'Failed to load tools');
          onToolsChange([]);
        }
      } catch (error) {
        console.error('Error loading tools:', error);
        onErrorChange('An error occurred while loading tools');
        onToolsChange([]);
      } finally {
        onLoadingChange(false);
      }
    };

    loadTools();
  }, [
    currentUser?.uid,
    filterState.tradeFilter,
    filterState.sectionFilter,
    filterState.categoryFilter,
    filterState.subcategoryFilter,
    filterState.statusFilter,
    filterState.searchTerm,
    filterState.sortBy,
    dataRefreshTrigger
  ]);

  const handleFilterChange = (field: string, value: string) => {
    const newFilterState = { ...filterState, [field]: value };

    if (field === 'tradeFilter') {
      newFilterState.sectionFilter = '';
      newFilterState.categoryFilter = '';
      newFilterState.subcategoryFilter = '';
    } else if (field === 'sectionFilter') {
      newFilterState.categoryFilter = '';
      newFilterState.subcategoryFilter = '';
    } else if (field === 'categoryFilter') {
      newFilterState.subcategoryFilter = '';
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
      statusFilter: '',
      sortBy: 'name'
    });
  };

  const handleCategoryEditorClose = () => {
    setShowCategoryEditor(false);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tools by name, description, or hierarchy..."
                value={filterState.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowCategoryEditor(true)}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
            >
              <Settings className="h-5 w-5" />
              Manage Categories
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <select
              value={filterState.tradeFilter}
              onChange={(e) => handleFilterChange('tradeFilter', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Trades</option>
              {tradeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={filterState.sectionFilter}
              onChange={(e) => handleFilterChange('sectionFilter', e.target.value)}
              disabled={!filterState.tradeFilter}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">All Sections</option>
              {sectionOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={filterState.categoryFilter}
              onChange={(e) => handleFilterChange('categoryFilter', e.target.value)}
              disabled={!filterState.sectionFilter}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">All Categories</option>
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={filterState.subcategoryFilter}
              onChange={(e) => handleFilterChange('subcategoryFilter', e.target.value)}
              disabled={!filterState.categoryFilter}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">All Subcategories</option>
              {subcategoryOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={filterState.statusFilter}
              onChange={(e) => handleFilterChange('statusFilter', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="in-use">In Use</option>
              <option value="maintenance">Maintenance</option>
            </select>

            <select
              value={filterState.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="brand">Sort by Brand</option>
              <option value="status">Sort by Status</option>
            </select>

            <button
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                hasActiveFilters
                  ? 'border-blue-600 text-blue-600 hover:bg-blue-50 cursor-pointer'
                  : 'border-gray-300 text-gray-400 cursor-not-allowed'
              }`}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {showCategoryEditor && (
        <ToolCategoryEditor
          isOpen={showCategoryEditor}
          onClose={handleCategoryEditorClose}
          onCategoryUpdated={onCategoryUpdated}
        />
      )}
    </>
  );
};

export default ToolsSearchFilter;