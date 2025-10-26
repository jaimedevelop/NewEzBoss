import React, { useState, useEffect } from 'react';
import { Search, FolderTree } from 'lucide-react';
import LaborCategoryEditor from './LaborCategoryEditor';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { 
  getProductTrades,
  type ProductTrade
} from '../../../../services/categories/trades';
import {
  getLaborSections,
  addLaborSection,
  type LaborSection
} from '../../../../services/inventory/labor/sections';
import {
  getLaborCategories,
  addLaborCategory,
  type LaborCategory
} from '../../../../services/inventory/labor/categories';

export interface LaborFilterState {
  searchTerm: string;
  tradeId: string;
  sectionId: string;
  categoryId: string;
  pricingType: string;
  sortBy: string;
}

interface LaborFilterProps {
  filterState: LaborFilterState;
  onFilterChange: (filterState: LaborFilterState) => void;
}

export const LaborFilter: React.FC<LaborFilterProps> = ({ 
  filterState, 
  onFilterChange 
}) => {
  const { currentUser } = useAuthContext();

  // Extract individual filter values
  const {
    searchTerm,
    tradeId,
    sectionId,
    categoryId,
    pricingType,
    sortBy
  } = filterState;

  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  // Data state for filter options
  const [trades, setTrades] = useState<ProductTrade[]>([]);
  const [sections, setSections] = useState<LaborSection[]>([]);
  const [categories, setCategories] = useState<LaborCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const pricingTypeOptions = [
    { value: '', label: 'All Pricing Types' },
    { value: 'flat-rate', label: 'With Flat Rates' },
    { value: 'hourly', label: 'With Hourly Rates' },
    { value: 'tasks', label: 'With Task Checklist' }
  ];

  const sortOptions = [
    { value: 'name', label: 'Sort by Name' },
    { value: 'tradeName', label: 'Trade' },
    { value: 'sectionName', label: 'Section' },
    { value: 'categoryName', label: 'Category' },
    { value: 'createdAt', label: 'Date Created' }
  ];

  // Load trades on mount (shared with products)
  useEffect(() => {
    const loadTrades = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const result = await getProductTrades(currentUser.uid);
        if (result.success && result.data) {
          setTrades(result.data);
        }
      } catch (error) {
        console.error('Error loading trades:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrades();
  }, [currentUser?.uid]);

  // Load sections when tradeId changes
  useEffect(() => {
    const loadSections = async () => {
      if (!tradeId || !currentUser?.uid) {
        setSections([]);
        return;
      }

      try {
        const result = await getLaborSections(tradeId, currentUser.uid);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId, currentUser?.uid]);

  // Load categories when sectionId changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!sectionId || !currentUser?.uid) {
        setCategories([]);
        return;
      }

      try {
        const result = await getLaborCategories(sectionId, currentUser.uid);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, currentUser?.uid]);

  // Handle filter changes with dependent filter resets
  const handleTradeChange = (value: string) => {
    const newFilterState: LaborFilterState = {
      ...filterState,
      tradeId: value,
      sectionId: '',
      categoryId: ''
    };
    onFilterChange(newFilterState);
  };

  const handleSectionChange = (value: string) => {
    const newFilterState: LaborFilterState = {
      ...filterState,
      sectionId: value,
      categoryId: ''
    };
    onFilterChange(newFilterState);
  };

  const handleCategoryChange = (value: string) => {
    const newFilterState: LaborFilterState = {
      ...filterState,
      categoryId: value
    };
    onFilterChange(newFilterState);
  };

  const handlePricingTypeChange = (value: string) => {
    const newFilterState: LaborFilterState = {
      ...filterState,
      pricingType: value
    };
    onFilterChange(newFilterState);
  };

  const handleSearchChange = (value: string) => {
    const newFilterState: LaborFilterState = {
      ...filterState,
      searchTerm: value
    };
    onFilterChange(newFilterState);
  };

  const handleSortChange = (value: string) => {
    const newFilterState: LaborFilterState = {
      ...filterState,
      sortBy: value
    };
    onFilterChange(newFilterState);
  };

  if (loading && trades.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-4">
          <div className="text-gray-500">Loading filters...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="space-y-4">
        {/* Search Input */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search labor items by name, description, or hierarchy..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

                {/* Manage Categories Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowCategoryEditor(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <FolderTree className="h-4 w-4" />
            Manage Categories
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {/* Trade Filter */}
          <select
            value={tradeId}
            onChange={(e) => handleTradeChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Trades</option>
            {trades.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Section Filter */}
          <select
            value={sectionId}
            onChange={(e) => handleSectionChange(e.target.value)}
            disabled={!tradeId}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={!sectionId}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Pricing Type Filter */}
          <select
            value={pricingType}
            onChange={(e) => handlePricingTypeChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {pricingTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Sort By Filter */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="col-span-2 md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
        <LaborCategoryEditor
          isOpen={showCategoryEditor}
          onClose={() => setShowCategoryEditor(false)}
          onCategoryUpdated={() => {
            // Reload trades, sections, and categories
            const loadTrades = async () => {
              if (!currentUser?.uid) return;
              try {
                const result = await getProductTrades(currentUser.uid);
                if (result.success && result.data) {
                  setTrades(result.data);
                }
              } catch (error) {
                console.error('Error loading trades:', error);
              }
            };
            loadTrades();
          }}
        />
      )}
    </div>
  );
};

export default LaborFilter;