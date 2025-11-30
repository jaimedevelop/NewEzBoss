// src/pages/inventory/equipment/components/EquipmentSearchFilter.tsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, Settings } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { 
  getEquipment,
  getEquipmentSections,
  getEquipmentCategories,
  getEquipmentSubcategories,
  type EquipmentItem 
} from '../../../../services/inventory/equipment'; // ✅ Import from index
import { getProductTrades } from '../../../../services/categories';
import GenericCategoryEditor from '../../../../mainComponents/hierarchy/GenericCategoryEditor';

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

  // Category editor state
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);

  // Dropdown options
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
      
      // ✅ FIXED: Correct parameter order (tradeId, userId)
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
      
      // ✅ FIXED: Correct parameter order (sectionId, userId)
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
      
      // ✅ FIXED: Correct parameter order (categoryId, userId)
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
          equipmentType: filterState.equipmentTypeFilter || undefined,
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

    // Reset dependent filters when parent changes
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Filter Equipment</h3>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCategoryEditor(true)}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Manage Categories</span>
              </button>
              <button
                onClick={handleClearFilters}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search equipment..."
                value={filterState.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Trade */}
            <select
              value={filterState.tradeFilter}
              onChange={(e) => handleFilterChange('tradeFilter', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Trades</option>
              {tradeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* Section */}
            <select
              value={filterState.sectionFilter}
              onChange={(e) => handleFilterChange('sectionFilter', e.target.value)}
              disabled={!filterState.tradeFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">All Sections</option>
              {sectionOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* Category */}
            <select
              value={filterState.categoryFilter}
              onChange={(e) => handleFilterChange('categoryFilter', e.target.value)}
              disabled={!filterState.sectionFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">All Categories</option>
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* Subcategory */}
            <select
              value={filterState.subcategoryFilter}
              onChange={(e) => handleFilterChange('subcategoryFilter', e.target.value)}
              disabled={!filterState.categoryFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">All Subcategories</option>
              {subcategoryOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* Equipment Type Filter */}
            <select
              value={filterState.equipmentTypeFilter}
              onChange={(e) => handleFilterChange('equipmentTypeFilter', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Equipment Types</option>
              <option value="owned">Owned</option>
              <option value="rented">Rented</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterState.statusFilter}
              onChange={(e) => handleFilterChange('statusFilter', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="in-use">In Use</option>
              <option value="maintenance">Maintenance</option>
            </select>

            {/* Sort By */}
            <select
              value={filterState.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="equipmentType">Sort by Type</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>
      </div>

      {showCategoryEditor && (
        <GenericCategoryEditor
          contentType="equipment"
          onClose={handleCategoryEditorClose}
          onCategoryUpdated={onCategoryUpdated}
        />
      )}
    </>
  );
};

export default EquipmentSearchFilter;