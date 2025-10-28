import React, { useState, useEffect } from 'react';
import { Search, FolderTree } from 'lucide-react';
import LaborCategoryEditor from './LaborCategoryEditor';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { 
  getProductTrades,
  type ProductTrade
} from '../../../../services/categories/trades';
import {
  getSections,
  getCategories,
  type LaborSection,
  type LaborCategory
} from '../../../../services/inventory/labor';

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
  onCategoryUpdated?: () => void;
}

export const LaborFilter: React.FC<LaborFilterProps> = ({ 
  filterState, 
  onFilterChange,
  onCategoryUpdated
}) => {
  const { currentUser } = useAuthContext();

  const {
    searchTerm,
    tradeId,
    sectionId,
    categoryId,
    pricingType,
    sortBy
  } = filterState;

  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
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

  // Load trades on mount
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
        const result = await getSections(tradeId, currentUser.uid);
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
  }, [tradeId, currentUser?.uid]);

  // Load categories when sectionId changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!sectionId || !currentUser?.uid) {
        setCategories([]);
        return;
      }

      try {
        const result = await getCategories(sectionId, currentUser.uid);
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
  }, [sectionId, currentUser?.uid]);

  const handleTradeChange = (value: string) => {
    onFilterChange({
      ...filterState,
      tradeId: value,
      sectionId: '',
      categoryId: ''
    });
  };

  const handleSectionChange = (value: string) => {
    onFilterChange({
      ...filterState,
      sectionId: value,
      categoryId: ''
    });
  };

  const handleCategoryChange = (value: string) => {
    onFilterChange({
      ...filterState,
      categoryId: value
    });
  };

  const handlePricingTypeChange = (value: string) => {
    onFilterChange({
      ...filterState,
      pricingType: value
    });
  };

  const handleSearchChange = (value: string) => {
    onFilterChange({
      ...filterState,
      searchTerm: value
    });
  };

  const handleSortChange = (value: string) => {
    onFilterChange({
      ...filterState,
      sortBy: value
    });
  };

  const handleCategoryEditorClose = async () => {
    setShowCategoryEditor(false);
    
    // Reload dropdowns after hierarchy changes
    if (currentUser?.uid) {
      // Reload trades
      const tradesResult = await getProductTrades(currentUser.uid);
      if (tradesResult.success && tradesResult.data) {
        setTrades(tradesResult.data);
      }
      
      // Reload sections if a trade is selected
      if (tradeId) {
        const sectionsResult = await getSections(tradeId, currentUser.uid);
        if (sectionsResult.success && sectionsResult.data) {
          setSections(sectionsResult.data);
        }
      }
      
      // Reload categories if a section is selected
      if (sectionId) {
        const categoriesResult = await getCategories(sectionId, currentUser.uid);
        if (categoriesResult.success && categoriesResult.data) {
          setCategories(categoriesResult.data);
        }
      }
      
      // Notify parent to reload labor items
      onCategoryUpdated?.();
    }
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
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search labor items by name, description, or hierarchy..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowCategoryEditor(true)}
            className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap"
          >
            <FolderTree className="h-5 w-5" />
            Manage Categories
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
      
      {showCategoryEditor && (
        <LaborCategoryEditor
          isOpen={showCategoryEditor}
          onClose={handleCategoryEditorClose}
          onCategoryUpdated={handleCategoryEditorClose}
        />
      )}
    </div>
  );
};

export default LaborFilter;