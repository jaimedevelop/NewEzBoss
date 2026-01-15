// src/pages/estimates/components/estimateDashboard/InventoryPickerModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, Briefcase, Wrench, Truck, Search, Plus, Check } from 'lucide-react';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { getProducts } from '../../../../../services/inventory/products';
import { getLaborItems } from '../../../../../services/inventory/labor';
import { getTools } from '../../../../../services/inventory/tools';
import { getEquipment } from '../../../../../services/inventory/equipment';
import { convertInventoryItemToLineItem } from '../../../../../services/estimates/estimates.inventory';
import type { LineItem } from '../../../../../services/estimates';

// Import hierarchy services
import { getProductTrades } from '../../../../../services/categories/trades';
import { getSections as getLaborSections } from '../../../../../services/inventory/labor/sections';
import { getCategories as getLaborCategories } from '../../../../../services/inventory/labor/categories';
import { getToolSections } from '../../../../../services/inventory/tools/sections';
import { getToolCategories } from '../../../../../services/inventory/tools/categories';
import { getToolSubcategories } from '../../../../../services/inventory/tools/subcategories';
import { getEquipmentSections } from '../../../../../services/inventory/equipment/sections';
import { getEquipmentCategories } from '../../../../../services/inventory/equipment/categories';
import { getEquipmentSubcategories } from '../../../../../services/inventory/equipment/subcategories';

interface InventoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: LineItem[]) => void;
}

type InventoryType = 'product' | 'labor' | 'tool' | 'equipment';

interface FilterState {
  trade: string;
  section: string;
  category: string;
  subcategory: string;
  type: string;
  size: string;
}

interface FilterOptions {
  trades: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  subcategories: Array<{ id: string; name: string }>;
  types: string[];
  sizes: string[];
}

export const InventoryPickerModal: React.FC<InventoryPickerModalProps> = ({
  isOpen,
  onClose,
  onAddItems
}) => {
  const { currentUser } = useAuthContext();
  const [selectedType, setSelectedType] = useState<InventoryType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedItems, setAddedItems] = useState<LineItem[]>([]);
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<FilterState>({
    trade: '',
    section: '',
    category: '',
    subcategory: '',
    type: '',
    size: ''
  });

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    trades: [],
    sections: [],
    categories: [],
    subcategories: [],
    types: [],
    sizes: []
  });

  // Load trades when modal opens
  useEffect(() => {
    if (isOpen && currentUser?.uid) {
      loadTrades();
    }
  }, [isOpen, currentUser?.uid]);

  // Load items when type or filters change
  useEffect(() => {
    if (!selectedType || !currentUser?.uid) return;
    loadItems();
  }, [selectedType, currentUser?.uid, filters]);

  // Load trades (shared across all inventory types)
  const loadTrades = async () => {
    if (!currentUser?.uid) return;

    try {
      const result = await getProductTrades(currentUser.uid);
      if (result.success && result.data) {
        setFilterOptions(prev => ({
          ...prev,
          trades: result.data!.map(t => ({ id: t.id!, name: t.name }))
        }));
      }
    } catch (error) {
      console.error('Error loading trades:', error);
    }
  };

  // Load sections based on selected trade
  useEffect(() => {
    if (!filters.trade || !selectedType || !currentUser?.uid) {
      setFilterOptions(prev => ({ ...prev, sections: [], categories: [], subcategories: [], types: [], sizes: [] }));
      return;
    }

    loadSections();
  }, [filters.trade, selectedType, currentUser?.uid]);

  const loadSections = async () => {
    if (!currentUser?.uid || !filters.trade) return;

    try {
      let result;
      switch (selectedType) {
        case 'product':
          // For products, we'll extract unique sections from loaded items
          return;
        case 'labor':
          result = await getLaborSections(filters.trade, currentUser.uid);
          break;
        case 'tool':
          result = await getToolSections(filters.trade, currentUser.uid);
          break;
        case 'equipment':
          result = await getEquipmentSections(filters.trade, currentUser.uid);
          break;
      }

      if (result?.success && result.data) {
        setFilterOptions(prev => ({
          ...prev,
          sections: result.data!.map((s: any) => ({ id: s.id!, name: s.name }))
        }));
      }
    } catch (error) {
      console.error('Error loading sections:', error);
    }
  };

  // Load categories based on selected section
  useEffect(() => {
    if (!filters.section || !selectedType || !currentUser?.uid) {
      setFilterOptions(prev => ({ ...prev, categories: [], subcategories: [], types: [], sizes: [] }));
      return;
    }

    loadCategories();
  }, [filters.section, selectedType, currentUser?.uid]);

  const loadCategories = async () => {
    if (!currentUser?.uid || !filters.section) return;

    try {
      let result;
      switch (selectedType) {
        case 'product':
          // For products, we'll extract unique categories from loaded items
          return;
        case 'labor':
          result = await getLaborCategories(filters.section, currentUser.uid);
          break;
        case 'tool':
          result = await getToolCategories(filters.section, currentUser.uid);
          break;
        case 'equipment':
          result = await getEquipmentCategories(filters.section, currentUser.uid);
          break;
      }

      if (result?.success && result.data) {
        setFilterOptions(prev => ({
          ...prev,
          categories: result.data!.map((c: any) => ({ id: c.id!, name: c.name }))
        }));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Load subcategories based on selected category
  useEffect(() => {
    if (!filters.category || !selectedType || !currentUser?.uid) {
      setFilterOptions(prev => ({ ...prev, subcategories: [], types: [], sizes: [] }));
      return;
    }

    loadSubcategories();
  }, [filters.category, selectedType, currentUser?.uid]);

  const loadSubcategories = async () => {
    if (!currentUser?.uid || !filters.category) return;

    try {
      let result;
      switch (selectedType) {
        case 'product':
          // For products, we'll extract unique subcategories from loaded items
          return;
        case 'tool':
          result = await getToolSubcategories(filters.category, currentUser.uid);
          break;
        case 'equipment':
          result = await getEquipmentSubcategories(filters.category, currentUser.uid);
          break;
        default:
          return;
      }

      if (result?.success && result.data) {
        setFilterOptions(prev => ({
          ...prev,
          subcategories: result.data!.map((sc: any) => ({ id: sc.id!, name: sc.name }))
        }));
      }
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };

  // Load items with filters
  const loadItems = async () => {
    if (!selectedType || !currentUser?.uid) return;

    setIsLoading(true);
    try {
      let result;
      switch (selectedType) {
        case 'product': {
          // For products, we use the ProductFilters interface
          const tradeName = filterOptions.trades.find(t => t.id === filters.trade)?.name;
          result = await getProducts({
            userId: currentUser.uid,
            trade: tradeName || undefined,
            section: filters.section || undefined,
            category: filters.category || undefined,
            subcategory: filters.subcategory || undefined,
            type: filters.type || undefined,
            size: filters.size || undefined
          });
          break;
        }
        case 'labor': {
          // For labor, we use LaborFilters with IDs
          const tradeName = filterOptions.trades.find(t => t.id === filters.trade)?.name;
          result = await getLaborItems(currentUser.uid, {
            tradeId: filters.trade || undefined,
            sectionId: filters.section || undefined,
            categoryId: filters.category || undefined
          });
          break;
        }
        case 'tool': {
          // For tools, we use ToolFilters with IDs
          result = await getTools(currentUser.uid, {
            tradeId: filters.trade || undefined,
            sectionId: filters.section || undefined,
            categoryId: filters.category || undefined,
            subcategoryId: filters.subcategory || undefined
          });
          break;
        }
        case 'equipment': {
          // For equipment, we use EquipmentFilters with IDs
          result = await getEquipment(currentUser.uid, {
            tradeId: filters.trade || undefined,
            sectionId: filters.section || undefined,
            categoryId: filters.category || undefined,
            subcategoryId: filters.subcategory || undefined
          });
          break;
        }
      }

      if (result?.success) {
        const data = Array.isArray(result.data)
          ? result.data
          : result.data?.laborItems || result.data?.products || [];
        setItems(data);

        // For products, extract unique values for client-side filters
        if (selectedType === 'product') {
          extractProductFilterOptions(data);
        }
      } else {
        console.error(`Failed to load ${selectedType}s:`, result?.error);
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract filter options from products (client-side)
  const extractProductFilterOptions = (products: any[]) => {
    if (!filters.trade) return;

    const tradeName = filterOptions.trades.find(t => t.id === filters.trade)?.name;
    const filtered = products.filter(p => p.trade === tradeName);

    // Extract unique sections
    if (!filters.section) {
      const sections = Array.from(new Set(filtered.map(p => p.section).filter(Boolean)))
        .sort()
        .map(name => ({ id: name, name }));
      setFilterOptions(prev => ({ ...prev, sections }));
    }

    // Extract unique categories
    if (filters.section && !filters.category) {
      const categories = Array.from(new Set(
        filtered.filter(p => p.section === filters.section).map(p => p.category).filter(Boolean)
      ))
        .sort()
        .map(name => ({ id: name, name }));
      setFilterOptions(prev => ({ ...prev, categories }));
    }

    // Extract unique subcategories
    if (filters.category && !filters.subcategory) {
      const subcategories = Array.from(new Set(
        filtered.filter(p => p.section === filters.section && p.category === filters.category)
          .map(p => p.subcategory).filter(Boolean)
      ))
        .sort()
        .map(name => ({ id: name, name }));
      setFilterOptions(prev => ({ ...prev, subcategories }));
    }

    // Extract unique types
    if (filters.subcategory && !filters.type) {
      const types = Array.from(new Set(
        filtered.filter(p =>
          p.section === filters.section &&
          p.category === filters.category &&
          p.subcategory === filters.subcategory
        ).map(p => p.type).filter(Boolean)
      )).sort();
      setFilterOptions(prev => ({ ...prev, types }));
    }

    // Extract unique sizes
    if (filters.type && !filters.size) {
      const sizes = Array.from(new Set(
        filtered.filter(p =>
          p.section === filters.section &&
          p.category === filters.category &&
          p.subcategory === filters.subcategory &&
          p.type === filters.type
        ).map(p => p.size).filter(Boolean)
      )).sort();
      setFilterOptions(prev => ({ ...prev, sizes }));
    }
  };

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;

    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.name?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.sku?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
      setSearchTerm('');
      setItems([]);
      setAddedItems([]);
      setAddedItemIds(new Set());
      setQuantities({});
      setFilters({
        trade: '',
        section: '',
        category: '',
        subcategory: '',
        type: '',
        size: ''
      });
      setFilterOptions({
        trades: [],
        sections: [],
        categories: [],
        subcategories: [],
        types: [],
        sizes: []
      });
    }
  }, [isOpen]);

  const handleTypeSelect = (type: InventoryType) => {
    setSelectedType(type);
    setSearchTerm('');
    // Don't reset filters - they persist when switching types
  };

  const handleFilterChange = (filterName: keyof FilterState, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };

      // Reset dependent filters when parent changes
      if (filterName === 'trade') {
        newFilters.section = '';
        newFilters.category = '';
        newFilters.subcategory = '';
        newFilters.type = '';
        newFilters.size = '';
      } else if (filterName === 'section') {
        newFilters.category = '';
        newFilters.subcategory = '';
        newFilters.type = '';
        newFilters.size = '';
      } else if (filterName === 'category') {
        newFilters.subcategory = '';
        newFilters.type = '';
        newFilters.size = '';
      } else if (filterName === 'subcategory') {
        newFilters.type = '';
        newFilters.size = '';
      } else if (filterName === 'type') {
        newFilters.size = '';
      }

      return newFilters;
    });
  };

  const handleAddItem = (item: any) => {
    if (!selectedType) return;

    const quantity = quantities[item.id] || 1;
    const lineItem = convertInventoryItemToLineItem(item, selectedType, quantity);
    setAddedItems(prev => [...prev, lineItem]);
    setAddedItemIds(prev => new Set([...prev, item.id]));
  };

  const handleDone = () => {
    if (addedItems.length > 0) {
      onAddItems(addedItems);
    }
    onClose();
  };

  const getTypeIcon = (type: InventoryType) => {
    switch (type) {
      case 'product': return Package;
      case 'labor': return Briefcase;
      case 'tool': return Wrench;
      case 'equipment': return Truck;
    }
  };

  const getTypeClasses = (type: InventoryType) => {
    switch (type) {
      case 'product':
        return {
          border: 'hover:border-orange-500',
          bg: 'hover:bg-orange-50',
          icon: 'text-orange-600 group-hover:text-orange-700',
          text: 'text-orange-700'
        };
      case 'labor':
        return {
          border: 'hover:border-purple-500',
          bg: 'hover:bg-purple-50',
          icon: 'text-purple-600 group-hover:text-purple-700',
          text: 'text-purple-700'
        };
      case 'tool':
        return {
          border: 'hover:border-blue-500',
          bg: 'hover:bg-blue-50',
          icon: 'text-blue-600 group-hover:text-blue-700',
          text: 'text-blue-700'
        };
      case 'equipment':
        return {
          border: 'hover:border-green-500',
          bg: 'hover:bg-green-50',
          icon: 'text-green-600 group-hover:text-green-700',
          text: 'text-green-700'
        };
    }
  };

  // Determine which filters to show based on inventory type
  const getVisibleFilters = () => {
    if (!selectedType) return [];

    switch (selectedType) {
      case 'product':
        return ['trade', 'section', 'category', 'subcategory', 'type', 'size'];
      case 'labor':
        return ['trade', 'section', 'category'];
      case 'tool':
      case 'equipment':
        return ['trade', 'section', 'category', 'subcategory'];
      default:
        return [];
    }
  };

  const renderFilterDropdown = (
    label: string,
    filterName: keyof FilterState,
    options: Array<{ id: string; name: string }> | string[],
    disabled: boolean
  ) => {
    const value = filters[filterName];
    const isStringArray = options.length > 0 && typeof options[0] === 'string';

    return (
      <div key={filterName}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => handleFilterChange(filterName, e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">All {label}</option>
          {isStringArray
            ? (options as string[]).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))
            : (options as Array<{ id: string; name: string }>).map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))
          }
        </select>
      </div>
    );
  };

  if (!isOpen) return null;

  const visibleFilters = getVisibleFilters();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Add From Inventory</h2>
            {addedItems.length > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {addedItems.length} added
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedType ? (
            // Type selection
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">Select inventory type to search:</p>
              <div className="grid grid-cols-2 gap-4">
                {(['product', 'labor', 'tool', 'equipment'] as InventoryType[]).map(type => {
                  const Icon = getTypeIcon(type);
                  const classes = getTypeClasses(type);
                  return (
                    <button
                      key={type}
                      onClick={() => handleTypeSelect(type)}
                      className={`p-6 border-2 rounded-lg transition-all flex flex-col items-center gap-3 group ${classes.border} ${classes.bg}`}
                    >
                      <Icon className={`h-12 w-12 ${classes.icon}`} />
                      <span className={`text-lg font-medium capitalize ${classes.text}`}>
                        {type === 'product' ? 'Products' : type === 'labor' ? 'Labor' : type === 'tool' ? 'Tools' : 'Equipment'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Search, filters, and results
            <div className="space-y-4">
              {/* Back button */}
              <button
                onClick={() => setSelectedType(null)}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                ← Back to type selection
              </button>

              {/* Filters */}
              {visibleFilters.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {visibleFilters.includes('trade') && renderFilterDropdown(
                      'Trade',
                      'trade',
                      filterOptions.trades,
                      false
                    )}
                    {visibleFilters.includes('section') && renderFilterDropdown(
                      'Section',
                      'section',
                      filterOptions.sections,
                      !filters.trade
                    )}
                    {visibleFilters.includes('category') && renderFilterDropdown(
                      'Category',
                      'category',
                      filterOptions.categories,
                      !filters.section
                    )}
                    {visibleFilters.includes('subcategory') && renderFilterDropdown(
                      'Subcategory',
                      'subcategory',
                      filterOptions.subcategories,
                      !filters.category
                    )}
                    {visibleFilters.includes('type') && renderFilterDropdown(
                      'Type',
                      'type',
                      filterOptions.types,
                      !filters.subcategory
                    )}
                    {visibleFilters.includes('size') && renderFilterDropdown(
                      'Size',
                      'size',
                      filterOptions.sizes,
                      !filters.type
                    )}
                  </div>
                </div>
              )}

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${selectedType}s...`}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Results */}
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">
                  Loading items...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? 'No items found matching your search' : 'No items available'}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredItems.slice(0, 20).map(item => {
                    const isAdded = addedItemIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-gray-500">{item.description}</div>
                          )}
                          {item.sku && (
                            <div className="text-xs text-gray-400 mt-1">SKU: {item.sku}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <input
                            type="number"
                            min="1"
                            value={quantities[item.id] || 1}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              if (val >= 0) {
                                setQuantities(prev => ({ ...prev, [item.id]: val }));
                              }
                            }}
                            disabled={isAdded}
                            className="w-20 px-2 py-2 border rounded-lg text-center"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={() => handleAddItem(item)}
                            disabled={isAdded}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${isAdded
                              ? 'bg-green-100 text-green-700 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="h-4 w-4" />
                                Added
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                Add
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredItems.length > 20 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Showing first 20 results. Refine your search to see more.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            disabled={addedItems.length === 0}
            className={`px-6 py-2 rounded-lg font-medium ${addedItems.length > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            Done ({addedItems.length})
          </button>
        </div>
      </div>
    </div>
  );
};