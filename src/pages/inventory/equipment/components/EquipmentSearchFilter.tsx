// src/pages/inventory/equipment/components/EquipmentSearchFilter.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Wrench } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import UtilitiesModal from '../../../../mainComponents/inventory/UtilitiesModal';
import EmptyChecker from '../../../../mainComponents/inventory/EmptyChecker';
import {
  getEquipment,
  getEquipmentSections,
  getEquipmentCategories,
  getEquipmentSubcategories,
  type EquipmentItem
} from '../../../../services/inventory/equipment';
import { getProductTrades } from '../../../../services/categories';
import EquipmentCategoryEditor from './EquipmentCategoryEditor';
import { Dropdown } from '../../../../mainComponents/forms/Dropdown';
import { Select } from '../../../../mainComponents/forms/Select';

const equipmentTypeOptions = [
  { value: '', label: 'All Equipment Types' },
  { value: 'owned', label: 'Owned' },
  { value: 'rented', label: 'Rented' }
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'in-use', label: 'In Use' },
  { value: 'maintenance', label: 'Maintenance' }
];

const sortOptions = [
  { value: 'name', label: 'Sort by Name' },
  { value: 'equipmentType', label: 'Sort by Type' },
  { value: 'status', label: 'Sort by Status' }
];

interface EquipmentSearchFilterProps {
  filterState: {
    searchTerm: string;
    tradeFilter: string;
    sectionFilter: string;
    categoryFilter: string;
    subcategoryFilter: string;
    equipmentTypeFilter: string;
    statusFilter: string;
    rentalStoreFilter: string;
    sortBy: string;
  };
  onFilterChange: (filterState: any) => void;
  dataRefreshTrigger: number;
  onEquipmentChange: (equipment: EquipmentItem[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onErrorChange: (error: string | null) => void;
  onCategoryUpdated: () => void;
}

const EquipmentSearchFilter: React.FC<EquipmentSearchFilterProps> = ({
  filterState,
  onFilterChange,
  dataRefreshTrigger,
  onEquipmentChange,
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
      filterState.equipmentTypeFilter ||
      filterState.statusFilter
    );
  }, [
    filterState.searchTerm,
    filterState.tradeFilter,
    filterState.sectionFilter,
    filterState.categoryFilter,
    filterState.subcategoryFilter,
    filterState.equipmentTypeFilter,
    filterState.statusFilter
  ]);

  const [showUtilitiesModal, setShowUtilitiesModal] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showEmptyChecker, setShowEmptyChecker] = useState(false);

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

      const result = await getEquipmentSections(filterState.tradeFilter, currentUser.uid);
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

      const result = await getEquipmentCategories(filterState.sectionFilter, currentUser.uid);
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

      const result = await getEquipmentSubcategories(filterState.categoryFilter, currentUser.uid);
      if (result.success && result.data) {
        setSubcategoryOptions(result.data.map(subcategory => ({
          value: subcategory.id || '',
          label: subcategory.name
        })));
      }
    };

    loadSubcategories();
  }, [currentUser?.uid, filterState.categoryFilter]);

  // Load equipment when filters change
  useEffect(() => {
    const loadEquipment = async () => {
      if (!currentUser?.uid) return;

      onLoadingChange(true);
      onErrorChange(null);

      try {
        const filters = {
          tradeId: filterState.tradeFilter || undefined,
          sectionId: filterState.sectionFilter || undefined,
          categoryId: filterState.categoryFilter || undefined,
          subcategoryId: filterState.subcategoryFilter || undefined,
          equipmentType: (filterState.equipmentTypeFilter as 'owned' | 'rented') || undefined,
          status: filterState.statusFilter || undefined,
          searchTerm: filterState.searchTerm || undefined,
          sortBy: filterState.sortBy as any,
          sortOrder: 'asc' as const
        };

        const result = await getEquipment(currentUser.uid, filters);

        if (result.success && result.data) {
          onEquipmentChange(result.data);
        } else {
          onErrorChange(result.error || 'Failed to load equipment');
          onEquipmentChange([]);
        }
      } catch (error) {
        console.error('Error loading equipment:', error);
        onErrorChange('An error occurred while loading equipment');
        onEquipmentChange([]);
      } finally {
        onLoadingChange(false);
      }
    };

    loadEquipment();
  }, [
    currentUser?.uid,
    filterState.tradeFilter,
    filterState.sectionFilter,
    filterState.categoryFilter,
    filterState.subcategoryFilter,
    filterState.equipmentTypeFilter,
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
      equipmentTypeFilter: '',
      statusFilter: '',
      rentalStoreFilter: '',
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
                placeholder="Search equipment by name, description, or hierarchy..."
                value={filterState.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowUtilitiesModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium whitespace-nowrap"
            >
              <Wrench className="h-5 w-5" />
              Utilities
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Dropdown
              value={filterState.tradeFilter}
              onChange={(val) => handleFilterChange('tradeFilter', val)}
              options={[{ value: '', label: 'All Trades' }, ...tradeOptions]}
              placeholder="All Trades"
            />

            <Dropdown
              value={filterState.sectionFilter}
              onChange={(val) => handleFilterChange('sectionFilter', val)}
              options={[{ value: '', label: 'All Sections' }, ...sectionOptions]}
              placeholder="All Sections"
              disabled={!filterState.tradeFilter}
            />

            <Dropdown
              value={filterState.categoryFilter}
              onChange={(val) => handleFilterChange('categoryFilter', val)}
              options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
              placeholder="All Categories"
              disabled={!filterState.sectionFilter}
            />

            <Dropdown
              value={filterState.subcategoryFilter}
              onChange={(val) => handleFilterChange('subcategoryFilter', val)}
              options={[{ value: '', label: 'All Subcategories' }, ...subcategoryOptions]}
              placeholder="All Subcategories"
              disabled={!filterState.categoryFilter}
            />

            <Select
              value={filterState.equipmentTypeFilter}
              onChange={(val) => handleFilterChange('equipmentTypeFilter', val)}
              options={equipmentTypeOptions}
              placeholder="All Equipment Types"
            />

            <Select
              value={filterState.statusFilter}
              onChange={(val) => handleFilterChange('statusFilter', val)}
              options={statusOptions}
              placeholder="All Statuses"
            />

            <Select
              value={filterState.sortBy}
              onChange={(val) => handleFilterChange('sortBy', val)}
              options={sortOptions}
              placeholder="Sort By..."
            />

            <button
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className={`px-4 py-2 border rounded-lg font-medium transition-colors ${hasActiveFilters
                ? 'border-green-600 text-green-600 hover:bg-green-50 cursor-pointer'
                : 'border-gray-300 text-gray-400 cursor-not-allowed'
                }`}
            >
              Clear All
            </button>
          </div>

        </div>
      </div>

      <UtilitiesModal
        isOpen={showUtilitiesModal}
        onClose={() => setShowUtilitiesModal(false)}
        onCategoryManagerClick={() => setShowCategoryEditor(true)}
        onEmptyCategoryCheckClick={() => setShowEmptyChecker(true)}
        moduleName="Equipment"
      />

      {showCategoryEditor && (
        <EquipmentCategoryEditor
          isOpen={showCategoryEditor}
          onClose={handleCategoryEditorClose}
          onCategoryUpdated={onCategoryUpdated}
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
          module="Equipment"
        />
      )}
    </>
  );
};

export default EquipmentSearchFilter;