// src/pages/inventory/equipment/components/EquipmentSearchFilter.tsx
import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { 
  getEquipment,
  type EquipmentFilters,
  type EquipmentItem
} from '../../../../services/inventory/equipment';
import { 
  getProductTrades,
  type ProductTrade
} from '../../../../services/categories/trades';
import { 
  getEquipmentSections
} from '../../../../services/inventory/equipment/sections';
import { 
  getEquipmentCategories
} from '../../../../services/inventory/equipment/categories';
import {
  getEquipmentSubcategories
} from '../../../../services/inventory/equipment/subcategories';
import {
  getRentalStores,
  type RentalStore
} from '../../../../services/inventory/equipment/rentalStores';
import {
  type EquipmentSection, 
  EquipmentCategory, 
  EquipmentSubcategory
} from '../../../../services/inventory/equipment/equipment.types';
import { useAuthContext } from '../../../../contexts/AuthContext';

interface FilterState {
  searchTerm: string;
  tradeFilter: string;      // Stores tradeId
  sectionFilter: string;    // Stores sectionId
  categoryFilter: string;   // Stores categoryId
  subcategoryFilter: string; // Stores subcategoryId
  equipmentTypeFilter: string;
  statusFilter: string;
  rentalStoreFilter: string;
  sortBy: string;
}

interface EquipmentSearchFilterProps {
  filterState: FilterState;
  onFilterChange: (filterState: FilterState) => void;
  dataRefreshTrigger?: number;
  onEquipmentChange?: (equipment: EquipmentItem[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onErrorChange?: (error: string | null) => void;
  pageSize?: number;
}

const EquipmentSearchFilter: React.FC<EquipmentSearchFilterProps> = ({
  filterState,
  onFilterChange,
  dataRefreshTrigger = 0,
  onEquipmentChange,
  onLoadingChange,
  onErrorChange,
  pageSize = 100
}) => {
  const { currentUser } = useAuthContext();
  
  const [internalRefreshTrigger, setInternalRefreshTrigger] = useState(0);
  
  const {
    searchTerm,
    tradeFilter,
    sectionFilter,
    categoryFilter,
    subcategoryFilter,
    equipmentTypeFilter,
    statusFilter,
    rentalStoreFilter,
    sortBy
  } = filterState;

  // Data state for filter options
  const [trades, setTrades] = useState<ProductTrade[]>([]);
  const [sections, setSections] = useState<EquipmentSection[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [subcategories, setSubcategories] = useState<EquipmentSubcategory[]>([]);
  const [rentalStores, setRentalStores] = useState<RentalStore[]>([]);
  const [loading, setLoading] = useState(true);

  const equipmentTypeOptions = [
    'All Types',
    'Owned',
    'Rented'
  ];

  const statusOptions = [
    'All Status',
    'Available',
    'In Use',
    'Maintenance'
  ];

  const sortOptions = [
    { value: 'name', label: 'Sort by Name' },
    { value: 'equipmentType', label: 'Type (Owned/Rented)' },
    { value: 'rentalStoreName', label: 'Rental Store' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'minimumCustomerCharge', label: 'Min Charge' },
    { value: 'status', label: 'Status' }
  ];

  // Load equipment when filters change or data refresh is triggered
  useEffect(() => {
    const loadEquipment = async () => {
      if (!currentUser?.uid) return;
      
      const isLoading = true;
      setLoading(isLoading);
      onLoadingChange?.(isLoading);
      onErrorChange?.(null);

      try {
        const filters: EquipmentFilters = {
          tradeId: tradeFilter || undefined,
          sectionId: sectionFilter || undefined,
          categoryId: categoryFilter || undefined,
          subcategoryId: subcategoryFilter || undefined,
          equipmentType: equipmentTypeFilter && equipmentTypeFilter !== 'All Types' 
            ? equipmentTypeFilter.toLowerCase() as 'owned' | 'rented'
            : undefined,
          status: statusFilter && statusFilter !== 'All Status' 
            ? statusFilter.toLowerCase().replace(' ', '-') 
            : undefined,
          rentalStoreName: rentalStoreFilter || undefined,
          searchTerm: searchTerm || undefined,
          sortBy: sortBy as any,
          sortOrder: 'asc'
        };

        const result = await getEquipment(currentUser.uid, filters, pageSize);
        
        if (result.success && result.data) {
          onEquipmentChange?.(result.data.equipment);
        } else {
          const error = result.error || 'Failed to load equipment';
          console.error('Equipment load error:', error);
          onErrorChange?.(typeof error === 'string' ? error : 'Failed to load equipment');
          onEquipmentChange?.([]);
        }
      } catch (err) {
        console.error('Error loading equipment:', err);
        const error = err instanceof Error ? err.message : 'An error occurred while loading equipment';
        onErrorChange?.(error);
        onEquipmentChange?.([]);
      } finally {
        const isLoading = false;
        setLoading(isLoading);
        onLoadingChange?.(isLoading);
      }
    };

    loadEquipment();
  }, [
    currentUser?.uid,
    searchTerm,
    tradeFilter,
    sectionFilter,
    categoryFilter,
    subcategoryFilter,
    equipmentTypeFilter,
    statusFilter,
    rentalStoreFilter,
    sortBy,
    pageSize,
    dataRefreshTrigger,
    onEquipmentChange,
    onLoadingChange,
    onErrorChange
  ]);

  // Load initial data when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        // Load trades and rental stores
        const [tradesResult, storesResult] = await Promise.all([
          getProductTrades(currentUser.uid),
          getRentalStores(currentUser.uid)
        ]);
        
        if (tradesResult.success && tradesResult.data) {
          setTrades(tradesResult.data);
        }
        
        if (storesResult.success && storesResult.data) {
          setRentalStores(storesResult.data);
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
        const result = await getEquipmentSections(tradeFilter, currentUser.uid);
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
        const result = await getEquipmentCategories(sectionFilter, currentUser.uid);
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
        const result = await getEquipmentSubcategories(categoryFilter, currentUser.uid);
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

  // Handle filter changes
  const handleTradeChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      tradeFilter: value,
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
      sectionFilter: value,
      categoryFilter: '',
      subcategoryFilter: ''
    };
    onFilterChange(newFilterState);
  };

  const handleCategoryChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      categoryFilter: value,
      subcategoryFilter: ''
    };
    onFilterChange(newFilterState);
  };

  const handleSubcategoryChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      subcategoryFilter: value
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

  const handleEquipmentTypeChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      equipmentTypeFilter: value
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

  const handleRentalStoreChange = (value: string) => {
    const newFilterState = {
      ...filterState,
      rentalStoreFilter: value
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
              placeholder="Search equipment by name, description, notes, or rental store..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Trade Filter */}
          <select
            value={tradeFilter}
            onChange={(e) => handleTradeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm"
          >
            <option value="">All Trades</option>
            {trades.map((trade) => (
              <option key={trade.id} value={trade.id}>
                {trade.name}
              </option>
            ))}
          </select>

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => handleSectionChange(e.target.value)}
            disabled={!tradeFilter}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={!sectionFilter}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Subcategory Filter */}
          <select
            value={subcategoryFilter}
            onChange={(e) => handleSubcategoryChange(e.target.value)}
            disabled={!categoryFilter}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Subcategories</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>

          {/* Equipment Type Filter */}
          <select
            value={equipmentTypeFilter}
            onChange={(e) => handleEquipmentTypeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm"
          >
            {equipmentTypeOptions.map((type) => (
              <option key={type} value={type === 'All Types' ? '' : type}>
                {type}
              </option>
            ))}
          </select>

          {/* Rental Store Filter */}
          <select
            value={rentalStoreFilter}
            onChange={(e) => handleRentalStoreChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm"
          >
            <option value="">All Stores</option>
            {rentalStores.map((store) => (
              <option key={store.id} value={store.name}>
                {store.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm"
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default EquipmentSearchFilter;