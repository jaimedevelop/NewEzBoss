// src/pages/collections/components/CollectionsScreen/components/CategoryTabView.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { Loader2, AlertCircle, Package, Edit2, Clock } from 'lucide-react';
import type { ItemSelection, CollectionContentType } from '../../../../../services/collections';

interface CategoryTabViewProps {
  contentType: CollectionContentType;
  categoryName: string;
  subcategories: string[];
  items: any[];
  selections: Record<string, ItemSelection>;
  isLoading: boolean;
  loadError: string | null;
  onToggleSelection: (itemId: string) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onLaborHoursChange?: (itemId: string, hours: number) => void;
  onRetry: () => void;
  newlyAddedItemIds?: Set<string>;
  filterState?: {
    searchTerm: string;
    sizeFilter: string;
    stockFilter: string;
    locationFilter: string;
  };
}

const CategoryTabView: React.FC<CategoryTabViewProps> = ({
  contentType,
  categoryName,
  subcategories,
  items,
  selections,
  isLoading,
  loadError,
  onToggleSelection,
  onQuantityChange,
  onLaborHoursChange,
  onRetry,
  newlyAddedItemIds,
  filterState,
}) => {

  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});
  const [editingHours, setEditingHours] = useState<string | null>(null);
  const [localHours, setLocalHours] = useState<Record<string, number>>({});

  // Build hierarchical path from items
  const hierarchicalPath = useMemo(() => {
    console.log('🔍 Items in CategoryTabView:', items);
    if (items.length === 0) return categoryName;
    
    const firstItem = items[0];
    const pathParts: string[] = [];
    
    switch (contentType) {
      case 'products':
        if (firstItem.trade) pathParts.push(firstItem.trade);
        if (firstItem.section) pathParts.push(firstItem.section);
        if (firstItem.category) pathParts.push(firstItem.category);
        break;
      case 'labor':
        if (firstItem.tradeName) pathParts.push(firstItem.tradeName);
        if (firstItem.sectionName) pathParts.push(firstItem.sectionName);
        if (firstItem.categoryName) pathParts.push(firstItem.categoryName);
        break;
      case 'tools':
      case 'equipment':
        if (firstItem.tradeName) pathParts.push(firstItem.tradeName);
        if (firstItem.sectionName) pathParts.push(firstItem.sectionName);
        if (firstItem.categoryName) pathParts.push(firstItem.categoryName);
        break;
    }
    
    return pathParts.length > 0 ? pathParts.join(' > ') : categoryName;
  }, [items, categoryName, contentType]);

  // ✅ Apply filters to items
  const filteredItems = useMemo(() => {
    if (!filterState) return items;

    return items.filter(item => {
      // Search filter
      if (filterState.searchTerm) {
        const searchLower = filterState.searchTerm.toLowerCase();
        const matchesSearch = 
          item.name?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.sku?.toLowerCase().includes(searchLower) ||
          item.skus?.[0]?.sku?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Size filter (products only)
      if (filterState.sizeFilter && contentType === 'products') {
        if (item.size !== filterState.sizeFilter) return false;
      }

      // Stock filter (products only)
      if (filterState.stockFilter && contentType === 'products') {
        const onHand = item.onHand || 0;
        const minStock = item.minStock || 0;
        
        switch (filterState.stockFilter) {
          case 'In Stock':
            if (onHand <= minStock) return false;
            break;
          case 'Low Stock':
            if (onHand === 0 || onHand > minStock) return false;
            break;
          case 'Out of Stock':
            if (onHand > 0) return false;
            break;
        }
      }

      // Location filter
      if (filterState.locationFilter) {
        if (item.location !== filterState.locationFilter) return false;
      }

      return true;
    });
  }, [items, filterState, contentType]);

  // ✅ Nested grouping for products (subcategory → type)
  const itemsBySubcategoryAndType = useMemo(() => {
    if (contentType !== 'products') {
      // For non-products, just group by subcategory (existing behavior)
      const grouped = new Map<string, any[]>();
      
      filteredItems.forEach(item => {
        const subcategory = item.subcategory || item.category || '';
        if (!grouped.has(subcategory)) {
          grouped.set(subcategory, []);
        }
        grouped.get(subcategory)!.push(item);
      });
      
      return grouped;
    }

    // ✅ For products: nested grouping (subcategory → type)
    const grouped = new Map<string, Map<string, any[]>>();
    
    filteredItems.forEach(item => {
      const subcategory = item.subcategory || item.category || '';
      const type = item.type || ''; // Type level (5th level)
      
      if (!grouped.has(subcategory)) {
        grouped.set(subcategory, new Map<string, any[]>());
      }
      
      const typeMap = grouped.get(subcategory)!;
      if (!typeMap.has(type)) {
        typeMap.set(type, []);
      }
      
      typeMap.get(type)!.push(item);
    });
    
    return grouped;
  }, [filteredItems, contentType]);

  const sortedSubcategories = useMemo(() => {
    const entries = itemsBySubcategoryAndType.entries() as IterableIterator<
      [string, any[] | Map<string, any[]>]
    >;
    return Array.from(entries).sort(([subA], [subB]) => {
      if (subA === '' && subB !== '') return -1;
      if (subA !== '' && subB === '') return 1;
      return subA.localeCompare(subB);
    });
  }, [itemsBySubcategoryAndType]);

  // Calculate totals using filtered items
  const selectedCount = filteredItems.filter(item => selections[item.id]?.isSelected).length;
  const totalValue = filteredItems
    .filter(item => selections[item.id]?.isSelected)
    .reduce((sum, item) => {
      const selection = selections[item.id];
      const price = getItemPrice(item, contentType, selection);
      return sum + (price * (selection?.quantity || 0));
    }, 0);

  // ===== QUANTITY HANDLERS =====
  const handleQuantityChange = useCallback((itemId: string, value: string) => {
    const numValue = parseInt(value) || 1;
    const clampedValue = Math.max(1, numValue);
    setLocalQuantities(prev => ({ ...prev, [itemId]: clampedValue }));
  }, []);

  const handleQuantityBlur = useCallback((itemId: string) => {
    const localQty = localQuantities[itemId];
    if (localQty !== undefined) {
      onQuantityChange(itemId, localQty);
      setLocalQuantities(prev => {
        const { [itemId]: removed, ...rest } = prev;
        return rest;
      });
    }
  }, [localQuantities, onQuantityChange]);

  const handleQuantityKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    itemId: string
  ) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }, []);

  const getDisplayQuantity = useCallback((itemId: string): number => {
    if (localQuantities[itemId] !== undefined) {
      return localQuantities[itemId];
    }
    return selections[itemId]?.quantity || 1;
  }, [localQuantities, selections]);

  // ===== LABOR HOURS HANDLERS =====
  const getEstimatedHours = useCallback((item: any, itemId: string): number => {
    if (localHours[itemId] !== undefined) {
      return localHours[itemId];
    }
    return selections[itemId]?.estimatedHours ?? item.estimatedHours ?? 0;
  }, [localHours, selections]);

  const handleHoursClick = useCallback((itemId: string) => {
    setEditingHours(itemId);
  }, []);

  const handleHoursChange = useCallback((itemId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, numValue);
    setLocalHours(prev => ({ ...prev, [itemId]: clampedValue }));
  }, []);

  const handleHoursBlur = useCallback((itemId: string) => {
    const localValue = localHours[itemId];
    if (localValue !== undefined && onLaborHoursChange) {
      onLaborHoursChange(itemId, localValue);
      setLocalHours(prev => {
        const { [itemId]: removed, ...rest } = prev;
        return rest;
      });
    }
    setEditingHours(null);
  }, [localHours, onLaborHoursChange]);

  const handleHoursKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    itemId: string
  ) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setLocalHours(prev => {
        const { [itemId]: removed, ...rest } = prev;
        return rest;
      });
      setEditingHours(null);
    }
  }, []);

  const isHoursOverridden = useCallback((item: any, itemId: string): boolean => {
    const overrideHours = selections[itemId]?.estimatedHours;
    const defaultHours = item.estimatedHours;
    return overrideHours !== undefined && overrideHours !== defaultHours;
  }, [selections]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4 text-sm">
          <h3 className="font-semibold text-gray-900">{hierarchicalPath}</h3>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600">
            {subcategories.length} subcategor{subcategories.length === 1 ? 'y' : 'ies'}
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600">
            <span className="font-semibold text-orange-600">{selectedCount}</span> of{' '}
            <span className="font-semibold">{filteredItems.length}</span> selected
          </span>
          {selectedCount > 0 && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">
                Total: <span className="font-semibold">${totalValue.toFixed(2)}</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
            <p className="text-gray-500">Loading {contentType}...</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-red-600 mb-2">{loadError}</p>
            <button onClick={onRetry} className="text-sm text-blue-600 hover:text-blue-700">
              Try again
            </button>
          </div>
        ) : sortedSubcategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Package className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium mb-1">
              {items.length === 0 ? `This category has no ${contentType}` : `No ${contentType} match your filters`}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2 w-12">
                  <input
                    type="checkbox"
                    checked={selectedCount === filteredItems.length && filteredItems.length > 0}
                    onChange={() => {
                      filteredItems.forEach(item => {
                        const isCurrentlySelected = selections[item.id]?.isSelected;
                        if (selectedCount === filteredItems.length) {
                          if (isCurrentlySelected) onToggleSelection(item.id);
                        } else {
                          if (!isCurrentlySelected) onToggleSelection(item.id);
                        }
                      });
                    }}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                </th>
                {renderTableHeaders(contentType)}
                <th className="px-4 py-2 w-24">Quantity</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedSubcategories.map(([subcategory, typesOrItems]) => {
                // ✅ Check if this is nested grouping (products) or flat (other types)
                const isNestedGrouping = typesOrItems instanceof Map;

                if (!isNestedGrouping) {
                  // Non-products: Render flat list under subcategory divider
                  const categoryItems = typesOrItems as any[];
                  
                  return (
                    <React.Fragment key={subcategory}>
                      {/* Subcategory Divider */}
                      <tr className="bg-blue-50 border-y border-blue-200">
                        <td colSpan={getColumnCount(contentType)} className="px-4 py-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                              {subcategory === '' ? 'No Subcategory' : subcategory}
                            </span>
                            <span className="text-xs text-blue-700">
                              {categoryItems.filter(item => selections[item.id]?.isSelected).length} / {categoryItems.length} selected
                            </span>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Items */}
                      {categoryItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`
                            hover:bg-gray-50 transition-colors border-b border-gray-100
                            ${selections[item.id]?.isSelected ? 'bg-orange-50' : ''}
                            ${newlyAddedItemIds?.has(item.id) ? 'animate-flash-orange' : ''}
                          `}
                        >
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selections[item.id]?.isSelected || false}
                              onChange={() => onToggleSelection(item.id)}
                              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                            />
                          </td>
                          {renderTableCells(
                            item,
                            contentType,
                            selections[item.id],
                            contentType === 'labor' ? {
                              editingHours,
                              getEstimatedHours,
                              handleHoursClick,
                              handleHoursChange,
                              handleHoursBlur,
                              handleHoursKeyDown,
                              isHoursOverridden,
                            } : undefined
                          )}
                          <td className="px-4 py-2">
                            {selections[item.id]?.isSelected ? (
                              <input
                                type="number"
                                min="1"
                                value={getDisplayQuantity(item.id)}
                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                onBlur={() => handleQuantityBlur(item.id)}
                                onKeyDown={(e) => handleQuantityKeyDown(e, item.id)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-orange-500 focus:border-orange-500"
                              />
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                }

                // ✅ Products: Render with nested type grouping
                const typeMap = typesOrItems as Map<string, any[]>;
                const sortedTypes = Array.from(typeMap.entries()).sort(([typeA], [typeB]) => {
                  if (typeA === '' && typeB !== '') return -1;
                  if (typeA !== '' && typeB === '') return 1;
                  return typeA.localeCompare(typeB);
                });

                return (
                  <React.Fragment key={subcategory}>
                    {/* Subcategory Divider */}
                    <tr className="bg-blue-50 border-y border-blue-200">
                      <td colSpan={getColumnCount(contentType)} className="px-4 py-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                            {subcategory === '' ? 'No Subcategory' : subcategory}
                          </span>
                          <span className="text-xs text-blue-700">
                            {Array.from(typeMap.values()).flat().filter(item => selections[item.id]?.isSelected).length} / {Array.from(typeMap.values()).flat().length} selected
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Type Dividers + Items */}
                    {sortedTypes.map(([type, typeItems]) => (
                      <React.Fragment key={`${subcategory}-${type}`}>
                        {/* ✅ Type Divider (indented, lighter style) */}
                        <tr className="bg-purple-50 border-y border-purple-100">
                          <td colSpan={getColumnCount(contentType)} className="py-1" style={{ paddingLeft: '2rem' }}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-purple-800 tracking-wide">
                                {type === '' ? 'No Type' : type}
                              </span>
                              <span className="text-xs text-purple-600 mr-4">
                                {typeItems.filter(item => selections[item.id]?.isSelected).length} / {typeItems.length} selected
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* ✅ Type Items (further indented) */}
                        {typeItems.map((item) => (
                          <tr
                            key={item.id}
                            className={`
                              hover:bg-gray-50 transition-colors border-b border-gray-100
                              ${selections[item.id]?.isSelected ? 'bg-orange-50' : ''}
                              ${newlyAddedItemIds?.has(item.id) ? 'animate-flash-orange' : ''}
                            `}
                          >
                            <td className="px-4 py-2" style={{ paddingLeft: '3rem' }}>
                              <input
                                type="checkbox"
                                checked={selections[item.id]?.isSelected || false}
                                onChange={() => onToggleSelection(item.id)}
                                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                              />
                            </td>
                            {renderTableCells(item, contentType, selections[item.id], undefined)}
                            <td className="px-4 py-2">
                              {selections[item.id]?.isSelected ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={getDisplayQuantity(item.id)}
                                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                  onBlur={() => handleQuantityBlur(item.id)}
                                  onKeyDown={(e) => handleQuantityKeyDown(e, item.id)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-orange-500 focus:border-orange-500"
                                />
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ===== HELPER FUNCTIONS =====

function getItemPrice(item: any, contentType: CollectionContentType, selection?: ItemSelection): number {
  if (selection?.unitPrice) return selection.unitPrice;
  
  switch (contentType) {
    case 'products':
      // ✅ Get HIGHEST price from priceEntries
      if (item?.priceEntries && Array.isArray(item.priceEntries) && item.priceEntries.length > 0) {
        const maxPrice = Math.max(...item.priceEntries.map((entry: any) => entry.price || 0));
        return maxPrice;
      }
      return item?.unitPrice || 0;
    case 'labor':
      return item?.flatRates?.[0]?.rate || item?.hourlyRates?.[0]?.hourlyRate || 0;
    case 'tools':
    case 'equipment':
      return item?.minimumCustomerCharge || 0;
    default:
      return 0;
  }
}

function getDisplayPrice(item: any, contentType: CollectionContentType): number {
  if (contentType === 'products') {
    // Get HIGHEST price from priceEntries
    if (item?.priceEntries && Array.isArray(item.priceEntries) && item.priceEntries.length > 0) {
      const maxPrice = Math.max(...item.priceEntries.map((entry: any) => entry.price || 0));
      return maxPrice;
    }
    return item?.unitPrice || 0;
  }
  
  if (contentType === 'labor') {
    return item?.flatRates?.[0]?.rate || item?.hourlyRates?.[0]?.hourlyRate || 0;
  }
  
  if (contentType === 'tools' || contentType === 'equipment') {
    return item?.minimumCustomerCharge || 0;
  }
  
  return 0;
}

function getColumnCount(contentType: CollectionContentType): number {
  switch (contentType) {
    case 'products':
      return 8;  // Checkbox + Product + Image + SKU + Price + Stock + Location + Quantity
    case 'labor':
      return 6;  // Checkbox + Labor Item + Rate Type + Est. Hours + Price + Quantity
    case 'tools':
    case 'equipment':
      return 8;  // Checkbox + Name + Image + Brand + Min Charge + Status + Location + Quantity
    default:
      return 5;
  }
}

function renderTableHeaders(contentType: CollectionContentType) {
  switch (contentType) {
    case 'products':
      return (
        <>
          <th className="px-4 py-2">Product</th>
          <th className="px-4 py-2">Image</th>
          <th className="px-4 py-2">SKU</th>
          <th className="px-4 py-2">Price</th>
          <th className="px-4 py-2">Stock</th>
          <th className="px-4 py-2">Location</th>
        </>
      );
    case 'labor':
      return (
        <>
          <th className="px-4 py-2">Labor Item</th>
          <th className="px-4 py-2">Rate Type</th>
          <th className="px-4 py-2">Est. Hours</th>
          <th className="px-4 py-2">Price</th>
        </>
      );
    case 'tools':
    case 'equipment':
      return (
        <>
          <th className="px-4 py-2">Name</th>
          <th className="px-4 py-2">Image</th>
          <th className="px-4 py-2">Brand</th>
          <th className="px-4 py-2">Min Charge</th>
          <th className="px-4 py-2">Status</th>
          <th className="px-4 py-2">Location</th>
        </>
      );
    default:
      return null;
  }
}

function renderTableCells(
  item: any,
  contentType: CollectionContentType,
  selection?: ItemSelection,
  hoursHandlers?: any
) {
  switch (contentType) {
    case 'products':
      return (
        <>
          <td className="px-4 py-2">
            <div className="text-sm font-medium text-gray-900">{item.name}</div>
            {item.description && (
              <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</div>
            )}
          </td>
          <td className="px-4 py-2 whitespace-nowrap">
            <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded overflow-hidden">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    `;
                  }}
                />
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          </td>
          <td className="px-4 py-2 text-sm text-gray-600">
            {item.skus?.[0]?.sku || item.sku || 'N/A'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            ${getDisplayPrice(item, contentType).toFixed(2)}
          </td>
          <td className="px-4 py-2">
            <div className={`text-sm font-medium ${
              item.onHand === 0 ? 'text-red-600' : item.onHand <= item.minStock ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {item.onHand || 0}
            </div>
            <div className="text-xs text-gray-500">Avail: {item.available || 0}</div>
          </td>
          <td className="px-4 py-2 text-sm text-gray-600">{item.location || '-'}</td>
        </>
      );
    
    case 'labor':
      const isEditing = hoursHandlers?.editingHours === item.id;
      const currentHours = hoursHandlers?.getEstimatedHours(item, item.id) || 0;
      const isOverridden = hoursHandlers?.isHoursOverridden(item, item.id);
      
      return (
        <>
          <td className="px-4 py-2">
            <div className="text-sm font-medium text-gray-900">{item.name}</div>
            {item.description && (
              <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</div>
            )}
          </td>
          <td className="px-4 py-2 text-sm text-gray-600">
            {item.flatRates?.length > 0 && item.hourlyRates?.length > 0 ? 'Both' : 
             item.flatRates?.length > 0 ? 'Flat' : 
             item.hourlyRates?.length > 0 ? 'Hourly' : '-'}
          </td>
          <td className="px-4 py-2">
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                min="0"
                value={currentHours}
                onChange={(e) => hoursHandlers.handleHoursChange(item.id, e.target.value)}
                onBlur={() => hoursHandlers.handleHoursBlur(item.id)}
                onKeyDown={(e) => hoursHandlers.handleHoursKeyDown(e, item.id)}
                className="w-20 px-2 py-1 border border-purple-300 rounded text-sm focus:ring-purple-500 focus:border-purple-500"
                autoFocus
              />
            ) : (
              <div 
                className="flex items-center gap-2 group cursor-pointer hover:bg-purple-50 rounded px-2 py-1 -mx-2 transition-colors"
                onClick={() => hoursHandlers?.handleHoursClick(item.id)}
              >
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-sm text-gray-900">
                  {currentHours > 0 ? `${currentHours}h` : '-'}
                </span>
                <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isOverridden && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                    Custom
                  </span>
                )}
              </div>
            )}
          </td>
          <td className="px-4 py-2 text-sm font-medium text-gray-900">
            ${(item.flatRates?.[0]?.rate || item.hourlyRates?.[0]?.hourlyRate || selection?.unitPrice || 0).toFixed(2)}
          </td>
        </>
      );
    
    case 'tools':
    case 'equipment':
      return (
        <>
          <td className="px-4 py-2">
            <div className="text-sm font-medium text-gray-900">{item.name}</div>
            {item.description && (
              <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</div>
            )}
          </td>
          <td className="px-4 py-2 whitespace-nowrap">
            <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded overflow-hidden">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    `;
                  }}
                />
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          </td>
          <td className="px-4 py-2 text-sm text-gray-600">
            {item.brand || '-'}
          </td>
          <td className="px-4 py-2 text-sm font-medium text-gray-900">
            ${(item.minimumCustomerCharge || 0).toFixed(2)}
          </td>
          <td className="px-4 py-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              item.status === 'available' ? 'bg-green-100 text-green-800' :
              item.status === 'in-use' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {item.status || 'available'}
            </span>
          </td>
          <td className="px-4 py-2 text-sm text-gray-600">{item.location || '-'}</td>
        </>
      );
    
    default:
      return null;
  }
}

export default CategoryTabView;