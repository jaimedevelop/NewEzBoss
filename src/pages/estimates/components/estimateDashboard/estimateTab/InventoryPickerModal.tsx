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
import { Dropdown } from '../../../../../mainComponents/forms/Dropdown';

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
  allowedTypes?: InventoryType[];
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

const sortByName = <T extends { name: string }>(arr: T[]): T[] =>
  [...arr].sort((a, b) => a.name.localeCompare(b.name));

const sortStrings = (arr: string[]): string[] =>
  [...arr].sort((a, b) => a.localeCompare(b));

// Per-type theme config
const typeTheme = {
  product: {
    bg: 'bg-orange-500',
    bgHover: 'hover:bg-orange-600',
    bgLight: 'bg-orange-50',
    iconCircle: 'bg-orange-400/40',
    text: 'text-white',
    label: 'Products',
    dropdownColor: 'orange' as const,
    headerBorder: 'border-orange-200',
    headerText: 'text-orange-700',
  },
  labor: {
    bg: 'bg-purple-500',
    bgHover: 'hover:bg-purple-600',
    bgLight: 'bg-purple-50',
    iconCircle: 'bg-purple-400/40',
    text: 'text-white',
    label: 'Labor',
    dropdownColor: 'purple' as const,
    headerBorder: 'border-purple-200',
    headerText: 'text-purple-700',
  },
  tool: {
    bg: 'bg-blue-500',
    bgHover: 'hover:bg-blue-600',
    bgLight: 'bg-blue-50',
    iconCircle: 'bg-blue-400/40',
    text: 'text-white',
    label: 'Tools',
    dropdownColor: 'blue' as const,
    headerBorder: 'border-blue-200',
    headerText: 'text-blue-700',
  },
  equipment: {
    bg: 'bg-green-500',
    bgHover: 'hover:bg-green-600',
    bgLight: 'bg-green-50',
    iconCircle: 'bg-green-400/40',
    text: 'text-white',
    label: 'Equipment & Rentals',
    dropdownColor: 'green' as const,
    headerBorder: 'border-green-200',
    headerText: 'text-green-700',
  },
};

const typeIcons = {
  product: Package,
  labor: Briefcase,
  tool: Wrench,
  equipment: Truck,
};

export const InventoryPickerModal: React.FC<InventoryPickerModalProps> = ({
  isOpen,
  onClose,
  onAddItems,
  allowedTypes
}) => {
  const { currentUser } = useAuthContext();
  const [selectedType, setSelectedType] = useState<InventoryType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedItems, setAddedItems] = useState<LineItem[]>([]);
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<FilterState>({
    trade: '', section: '', category: '', subcategory: '', type: '', size: ''
  });

  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    trades: [], sections: [], categories: [], subcategories: [], types: [], sizes: []
  });

  useEffect(() => {
    if (isOpen && currentUser?.uid) loadTrades();
  }, [isOpen, currentUser?.uid]);

  useEffect(() => {
    if (!selectedType || !currentUser?.uid) return;
    loadItems();
  }, [selectedType, currentUser?.uid, filters]);

  const loadTrades = async () => {
    if (!currentUser?.uid) return;
    try {
      const result = await getProductTrades(currentUser.uid);
      if (result.success && result.data) {
        setFilterOptions(prev => ({
          ...prev,
          trades: sortByName(result.data!.map(t => ({ id: t.id!, name: t.name })))
        }));
      }
    } catch (error) {
      console.error('Error loading trades:', error);
    }
  };

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
        case 'product': return; // Extracted client-side from loaded items
        case 'labor': result = await getLaborSections(filters.trade, currentUser.uid); break;
        case 'tool': result = await getToolSections(filters.trade, currentUser.uid); break;
        case 'equipment': result = await getEquipmentSections(filters.trade, currentUser.uid); break;
      }
      if (result?.success && result.data) {
        setFilterOptions(prev => ({
          ...prev,
          sections: sortByName(result.data!.map((s: any) => ({ id: s.id!, name: s.name })))
        }));
      }
    } catch (error) {
      console.error('Error loading sections:', error);
    }
  };

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
        case 'product': return; // Extracted client-side from loaded items
        case 'labor': result = await getLaborCategories(filters.section, currentUser.uid); break;
        case 'tool': result = await getToolCategories(filters.section, currentUser.uid); break;
        case 'equipment': result = await getEquipmentCategories(filters.section, currentUser.uid); break;
      }
      if (result?.success && result.data) {
        setFilterOptions(prev => ({
          ...prev,
          categories: sortByName(result.data!.map((c: any) => ({ id: c.id!, name: c.name })))
        }));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

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
        case 'product': return; // Extracted client-side from loaded items
        case 'tool': result = await getToolSubcategories(filters.category, currentUser.uid); break;
        case 'equipment': result = await getEquipmentSubcategories(filters.category, currentUser.uid); break;
        default: return;
      }
      if (result?.success && result.data) {
        setFilterOptions(prev => ({
          ...prev,
          subcategories: sortByName(result.data!.map((sc: any) => ({ id: sc.id!, name: sc.name })))
        }));
      }
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };

  const loadItems = async () => {
    if (!selectedType || !currentUser?.uid) return;
    setIsLoading(true);
    try {
      let result;
      switch (selectedType) {
        case 'product': {
          // For products, filters use names rather than IDs
          const tradeName = filterOptions.trades.find(t => t.id === filters.trade)?.name;
          result = await getProducts({
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
          result = await getLaborItems(currentUser.uid, {
            tradeId: filters.trade || undefined,
            sectionId: filters.section || undefined,
            categoryId: filters.category || undefined
          });
          break;
        }
        case 'tool': {
          result = await getTools(currentUser.uid, {
            tradeId: filters.trade || undefined,
            sectionId: filters.section || undefined,
            categoryId: filters.category || undefined,
            subcategoryId: filters.subcategory || undefined
          });
          break;
        }
        case 'equipment': {
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
          : (result.data as any)?.laborItems || (result.data as any)?.products || [];
        setItems(data);
        if (selectedType === 'product') extractProductFilterOptions(data);
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

  // For products, hierarchy filter options are extracted client-side from loaded items
  const extractProductFilterOptions = (products: any[]) => {
    if (!filters.trade) return;
    const tradeName = filterOptions.trades.find(t => t.id === filters.trade)?.name;
    const filtered = products.filter(p => p.trade === tradeName);

    if (!filters.section) {
      const sections = sortStrings(Array.from(new Set(filtered.map(p => p.section).filter(Boolean))))
        .map(name => ({ id: name, name }));
      setFilterOptions(prev => ({ ...prev, sections }));
    }
    if (filters.section && !filters.category) {
      const categories = sortStrings(Array.from(new Set(
        filtered.filter(p => p.section === filters.section).map(p => p.category).filter(Boolean)
      ))).map(name => ({ id: name, name }));
      setFilterOptions(prev => ({ ...prev, categories }));
    }
    if (filters.category && !filters.subcategory) {
      const subcategories = sortStrings(Array.from(new Set(
        filtered.filter(p => p.section === filters.section && p.category === filters.category)
          .map(p => p.subcategory).filter(Boolean)
      ))).map(name => ({ id: name, name }));
      setFilterOptions(prev => ({ ...prev, subcategories }));
    }
    if (filters.subcategory && !filters.type) {
      const types = sortStrings(Array.from(new Set(
        filtered.filter(p =>
          p.section === filters.section &&
          p.category === filters.category &&
          p.subcategory === filters.subcategory
        ).map(p => p.type).filter(Boolean)
      )));
      setFilterOptions(prev => ({ ...prev, types }));
    }
    if (filters.type && !filters.size) {
      const sizes = sortStrings(Array.from(new Set(
        filtered.filter(p =>
          p.section === filters.section &&
          p.category === filters.category &&
          p.subcategory === filters.subcategory &&
          p.type === filters.type
        ).map(p => p.size).filter(Boolean)
      )));
      setFilterOptions(prev => ({ ...prev, sizes }));
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.name?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.sku?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
      setSearchTerm('');
      setItems([]);
      setAddedItems([]);
      setRecentlyAddedIds(new Set());
      setQuantities({});
      setFilters({ trade: '', section: '', category: '', subcategory: '', type: '', size: '' });
      setFilterOptions({ trades: [], sections: [], categories: [], subcategories: [], types: [], sizes: [] });
    }
  }, [isOpen]);

  const handleTypeSelect = (type: InventoryType) => {
    setSelectedType(type);
    setSearchTerm('');
  };

  const handleFilterChange = (filterName: keyof FilterState, value: string) => {
    setFilters(prev => {
      const next = { ...prev, [filterName]: value };
      // Reset all dependent filters when a parent changes
      if (filterName === 'trade') { next.section = ''; next.category = ''; next.subcategory = ''; next.type = ''; next.size = ''; }
      else if (filterName === 'section') { next.category = ''; next.subcategory = ''; next.type = ''; next.size = ''; }
      else if (filterName === 'category') { next.subcategory = ''; next.type = ''; next.size = ''; }
      else if (filterName === 'subcategory') { next.type = ''; next.size = ''; }
      else if (filterName === 'type') { next.size = ''; }
      return next;
    });
  };

  const handleAddItem = (item: any) => {
    if (!selectedType) return;
    const quantity = parseFloat(quantities[item.id] || '1') || 1;

    setAddedItems(prev => {
      const existingIndex = prev.findIndex(ai => ai.itemId === item.id && ai.type === selectedType);
      if (existingIndex > -1) {
        const next = [...prev];
        const updated = { ...next[existingIndex] };
        updated.quantity += quantity;
        updated.total = updated.quantity * updated.unitPrice;
        next[existingIndex] = updated;
        return next;
      }
      return [...prev, convertInventoryItemToLineItem(item, selectedType, quantity)];
    });

    setRecentlyAddedIds(prev => new Set([...prev, item.id]));
    setTimeout(() => {
      setRecentlyAddedIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }, 2000);
  };

  const handleDone = () => {
    if (addedItems.length > 0) onAddItems(addedItems);
    onClose();
  };

  const getVisibleFilters = () => {
    if (!selectedType) return [];
    switch (selectedType) {
      case 'product': return ['trade', 'section', 'category', 'subcategory', 'type', 'size'];
      case 'labor': return ['trade', 'section', 'category'];
      case 'tool':
      case 'equipment': return ['trade', 'section', 'category', 'subcategory'];
      default: return [];
    }
  };

  const toDropdownOptions = (items: Array<{ id: string; name: string }>) =>
    items.map(i => ({ value: i.id, label: i.name }));

  const toStringDropdownOptions = (items: string[]) =>
    items.map(i => ({ value: i, label: i }));

  const renderFilterDropdown = (
    label: string,
    filterName: keyof FilterState,
    options: Array<{ id: string; name: string }> | string[],
    disabled: boolean,
    dropdownColor: 'orange' | 'purple' | 'blue' | 'green' | 'regular'
  ) => {
    const isStringArray = options.length > 0 && typeof options[0] === 'string';
    const dropdownOptions = isStringArray
      ? toStringDropdownOptions(options as string[])
      : toDropdownOptions(options as Array<{ id: string; name: string }>);

    return (
      <div key={filterName}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <Dropdown
          value={filters[filterName]}
          onChange={(val) => handleFilterChange(filterName, val)}
          options={dropdownOptions}
          placeholder={`All ${label}`}
          disabled={disabled}
          color={dropdownColor}
        />
      </div>
    );
  };

  if (!isOpen) return null;

  const visibleFilters = getVisibleFilters();
  const theme = selectedType ? typeTheme[selectedType] : null;

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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedType ? (
            // Type selection cards — styled like the inventory hub
            <div className="p-6 space-y-4">
              <p className="text-gray-500 text-center mb-6">Select a category to add inventory items</p>
              <div className="grid grid-cols-2 gap-4">
                {(['product', 'labor', 'tool', 'equipment'] as InventoryType[])
                  .filter(type => !allowedTypes || allowedTypes.includes(type))
                  .map(type => {
                    const t = typeTheme[type];
                    const Icon = typeIcons[type];
                    return (
                      <button
                        key={type}
                        onClick={() => handleTypeSelect(type)}
                        className={`${t.bg} ${t.bgHover} rounded-xl p-8 flex flex-col items-center gap-4 transition-all shadow-sm hover:shadow-md`}
                      >
                        <div className={`${t.iconCircle} rounded-full p-5`}>
                          <Icon className="h-10 w-10 text-white" />
                        </div>
                        <div className="text-center">
                          <div className="text-white font-bold text-xl">{t.label}</div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Colored type header banner */}
              <div className={`${theme!.bg} px-6 py-4 flex items-center gap-3`}>
                {(() => { const Icon = typeIcons[selectedType]; return <Icon className="h-5 w-5 text-white" />; })()}
                <span className="text-white font-semibold text-lg">{theme!.label}</span>
                <button
                  onClick={() => setSelectedType(null)}
                  className="ml-auto text-white/70 hover:text-white text-sm flex items-center gap-1"
                >
                  ← Change type
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Filters */}
                {visibleFilters.length > 0 && (
                  <div className={`${theme!.bgLight} p-4 rounded-lg border ${theme!.headerBorder}`}>
                    <h3 className={`text-sm font-semibold mb-3 ${theme!.headerText}`}>Filters</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {visibleFilters.includes('trade') && renderFilterDropdown('Trade', 'trade', filterOptions.trades, false, theme!.dropdownColor)}
                      {visibleFilters.includes('section') && renderFilterDropdown('Section', 'section', filterOptions.sections, !filters.trade, theme!.dropdownColor)}
                      {visibleFilters.includes('category') && renderFilterDropdown('Category', 'category', filterOptions.categories, !filters.section, theme!.dropdownColor)}
                      {visibleFilters.includes('subcategory') && renderFilterDropdown('Subcategory', 'subcategory', filterOptions.subcategories, !filters.category, theme!.dropdownColor)}
                      {visibleFilters.includes('type') && renderFilterDropdown('Type', 'type', filterOptions.types, !filters.subcategory, theme!.dropdownColor)}
                      {visibleFilters.includes('size') && renderFilterDropdown('Size', 'size', filterOptions.sizes, !filters.type, theme!.dropdownColor)}
                    </div>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search ${theme!.label.toLowerCase()}...`}
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>

                {/* Results */}
                {isLoading ? (
                  <div className="text-center py-12 text-gray-500">Loading items...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No items found matching your search' : 'No items available'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredItems.slice(0, 20).map(item => {
                      const isRecentlyAdded = recentlyAddedIds.has(item.id);
                      const addedItem = addedItems.find(ai => ai.itemId === item.id && ai.type === selectedType);
                      const itemCount = addedItem ? addedItem.quantity : 0;

                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              {itemCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                  {itemCount}
                                </span>
                              )}
                            </div>
                            {item.description && <div className="text-sm text-gray-500">{item.description}</div>}
                            {item.sku && <div className="text-xs text-gray-400 mt-1">SKU: {item.sku}</div>}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <input
                              type="number"
                              value={quantities[item.id] ?? "1"}
                              onChange={(e) => setQuantities(prev => ({ ...prev, [item.id]: e.target.value }))}
                              disabled={isRecentlyAdded}
                              className="w-20 px-2 py-2 border rounded-lg text-center disabled:bg-gray-50 disabled:text-gray-400"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={() => handleAddItem(item)}
                              disabled={isRecentlyAdded}
                              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors min-w-[90px] justify-center ${isRecentlyAdded
                                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                              {isRecentlyAdded
                                ? <><Check className="h-4 w-4" />Added</>
                                : <><Plus className="h-4 w-4" />Add</>
                              }
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:text-gray-900">
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