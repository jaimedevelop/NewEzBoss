// src/pages/labor/components/LaborFilter.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Wrench } from 'lucide-react';
import LaborCategoryEditor from './LaborCategoryEditor';
import UtilitiesModal from '../../../../mainComponents/inventory/UtilitiesModal';
import EmptyChecker from '../../../../mainComponents/inventory/EmptyChecker';
import { Dropdown } from '../../../../mainComponents/forms/Dropdown';
import { Select } from '../../../../mainComponents/forms/Select';
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
  tier: string;
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
    tier,
    sortBy
  } = filterState;

  // Check if any filters are active (excluding sortBy which always has a value)
  const hasActiveFilters = useMemo(() => {
    return !!(
      searchTerm ||
      tradeId ||
      sectionId ||
      categoryId ||
      tier
    );
  }, [searchTerm, tradeId, sectionId, categoryId, tier]);

  const [showUtilitiesModal, setShowUtilitiesModal] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showEmptyChecker, setShowEmptyChecker] = useState(false);
  const [trades, setTrades] = useState<ProductTrade[]>([]);
  const [sections, setSections] = useState<LaborSection[]>([]);
  const [categories, setCategories] = useState<LaborCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const tierOptions = useMemo(() => {
    const baseTiers = [
      { value: 'Standard', label: 'Standard' },
      { value: 'Plus', label: 'Plus' },
      { value: 'Premium', label: 'Premium' },
      { value: 'Commercial', label: 'Commercial' },
      { value: 'Tier 1', label: 'Tier 1' },
      { value: 'Tier 2', label: 'Tier 2' },
      { value: 'Tier 3', label: 'Tier 3' },
      { value: 'Tier 4', label: 'Tier 4' },
      { value: 'Tier 5', label: 'Tier 5' },
      { value: 'Tier 6', label: 'Tier 6' },
      { value: 'Collection', label: 'Collection' }
    ].sort((a, b) => a.label.localeCompare(b.label));

    return [
      { value: '', label: 'All Tiers' },
      ...baseTiers
    ];
  }, []);

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => a.name.localeCompare(b.name));
  }, [trades]);

  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => a.name.localeCompare(b.name));
  }, [sections]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

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

  const handleTierChange = (value: string) => {
    onFilterChange({
      ...filterState,
      tier: value
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

  const handleClearFilters = () => {
    onFilterChange({
      searchTerm: '',
      tradeId: '',
      sectionId: '',
      categoryId: '',
      tier: '',
      sortBy: 'name'
    });
  };

  // Function to reload dropdowns (doesn't close modal)
  const handleCategoryUpdate = async () => {
    if (!currentUser?.uid) return;

    const tradesResult = await getProductTrades(currentUser.uid);
    if (tradesResult.success && tradesResult.data) {
      setTrades(tradesResult.data);
    }

    if (tradeId) {
      const sectionsResult = await getSections(tradeId, currentUser.uid);
      if (sectionsResult.success && sectionsResult.data) {
        setSections(sectionsResult.data);
      }
    }

    if (sectionId) {
      const categoriesResult = await getCategories(sectionId, currentUser.uid);
      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
      }
    }

    onCategoryUpdated?.();
  };

  const handleCategoryEditorClose = () => {
    setShowCategoryEditor(false);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
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
              onClick={() => setShowUtilitiesModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap"
            >
              <Wrench className="h-5 w-5" />
              Utilities
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Dropdown
            value={tradeId}
            onChange={handleTradeChange}
            options={sortedTrades.map(t => ({ value: t.id!, label: t.name }))}
            placeholder="All Trades"
          />

          <Dropdown
            value={sectionId}
            onChange={handleSectionChange}
            options={sortedSections.map(s => ({ value: s.id!, label: s.name }))}
            placeholder="All Sections"
            disabled={!tradeId}
          />

          <Dropdown
            value={categoryId}
            onChange={handleCategoryChange}
            options={sortedCategories.map(c => ({ value: c.id!, label: c.name }))}
            placeholder="All Categories"
            disabled={!sectionId}
          />

          <Select
            value={tier}
            onChange={handleTierChange}
            options={tierOptions}
            placeholder="All Tiers"
          />

          <Select
            value={sortBy}
            onChange={handleSortChange}
            options={sortOptions}
            placeholder="Sort By..."
          />

          <button
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
            className={`px-4 py-2 border rounded-lg font-medium transition-colors ${hasActiveFilters
              ? 'border-purple-600 text-purple-600 hover:bg-purple-50 cursor-pointer'
              : 'border-gray-300 text-gray-400 cursor-not-allowed'
              }`}
          >
            Clear All
          </button>
        </div>

      </div>

      <UtilitiesModal
        isOpen={showUtilitiesModal}
        onClose={() => setShowUtilitiesModal(false)}
        onCategoryManagerClick={() => setShowCategoryEditor(true)}
        onEmptyCategoryCheckClick={() => setShowEmptyChecker(true)}
        moduleName="Labor"
      />

      {showCategoryEditor && (
        <LaborCategoryEditor
          isOpen={showCategoryEditor}
          onClose={handleCategoryEditorClose}
          onCategoryUpdated={handleCategoryUpdate}
          onBack={() => {
            setShowCategoryEditor(false);
            setShowUtilitiesModal(true);
          }}
        />
      )}

      {showEmptyChecker && (
        <EmptyChecker
          isOpen={showEmptyChecker}
          onClose={() => setShowEmptyChecker(false)}
          onBack={() => {
            setShowEmptyChecker(false);
            setShowUtilitiesModal(true);
          }}
          module="Labor"
        />
      )}
    </div>
  );
};

export default LaborFilter;