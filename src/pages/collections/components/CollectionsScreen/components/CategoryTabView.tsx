// src/pages/collections/components/CollectionsScreen/components/CategoryTabView.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { Loader2, AlertCircle, Package } from 'lucide-react';
import type { ItemSelection, CollectionContentType } from '../../../../../services/collections';

interface CategoryTabViewProps {
  contentType: CollectionContentType;
  categoryName: string;
  subcategories: string[];
  items: any[]; // Products, labor, tools, or equipment
  selections: Record<string, ItemSelection>;
  isLoading: boolean;
  loadError: string | null;
  onToggleSelection: (itemId: string) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRetry: () => void;
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
  onRetry,
}) => {
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});

  // Group items by subcategory
  const itemsBySubcategory = useMemo(() => {
    const grouped = new Map<string, any[]>();
    
    items.forEach(item => {
      const subcategory = item.subcategory || item.category || '';
      if (!grouped.has(subcategory)) {
        grouped.set(subcategory, []);
      }
      grouped.get(subcategory)!.push(item);
    });
    
    return grouped;
  }, [items]);

  const sortedSubcategories = useMemo(() => {
    return Array.from(itemsBySubcategory.entries()).sort(([subA], [subB]) => {
      if (subA === '' && subB !== '') return -1;
      if (subA !== '' && subB === '') return 1;
      return subA.localeCompare(subB);
    });
  }, [itemsBySubcategory]);

  const allItems = Array.from(itemsBySubcategory.values()).flat();
  const selectedCount = allItems.filter(item => selections[item.id]?.isSelected).length;
  const totalValue = allItems
    .filter(item => selections[item.id]?.isSelected)
    .reduce((sum, item) => {
      const selection = selections[item.id];
      const price = getItemPrice(item, contentType, selection);
      return sum + (price * (selection?.quantity || 0));
    }, 0);

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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{categoryName}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {subcategories.length} subcategor{subcategories.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-orange-600">{selectedCount}</span> of{' '}
              <span className="font-semibold">{allItems.length}</span> selected
            </div>
            {selectedCount > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Total: ${totalValue.toFixed(2)}
              </div>
            )}
          </div>
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
                    checked={selectedCount === allItems.length && allItems.length > 0}
                    onChange={() => {
                      allItems.forEach(item => {
                        const isCurrentlySelected = selections[item.id]?.isSelected;
                        if (selectedCount === allItems.length) {
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
              {sortedSubcategories.map(([subcategory, categoryItems]) => (
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
                  {categoryItems.map((item) => {
                    const selection = selections[item.id];
                    const isSelected = selection?.isSelected || false;
                    const quantity = getDisplayQuantity(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                          isSelected ? 'bg-orange-50' : ''
                        }`}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelection(item.id)}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                        </td>
                        {renderTableCells(item, contentType, selection)}
                        <td className="px-4 py-2">
                          {isSelected ? (
                            <input
                              type="number"
                              min="1"
                              value={quantity}
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
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Helper functions
function getItemPrice(item: any, contentType: CollectionContentType, selection?: ItemSelection): number {
  if (selection?.unitPrice) return selection.unitPrice;
  
  switch (contentType) {
    case 'products':
    case 'tools':
    case 'equipment':
      return item.priceEntries?.[0]?.price || 0;
    case 'labor':
      // For labor, we'd need to calculate based on rate type
      return 0; // Will be set when selecting rate
    default:
      return 0;
  }
}

function getColumnCount(contentType: CollectionContentType): number {
  switch (contentType) {
    case 'products':
      return 7; // Checkbox + Name + SKU + Price + Stock + Location + Quantity
    case 'labor':
      return 6; // Checkbox + Name + Rate Type + Estimated Hours + Price + Quantity
    case 'tools':
    case 'equipment':
      return 7; // Checkbox + Name + SKU + Price + Stock + Location + Quantity
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
          <th className="px-4 py-2">SKU</th>
          <th className="px-4 py-2">Price</th>
          <th className="px-4 py-2">Stock</th>
          <th className="px-4 py-2">Location</th>
        </>
      );
    default:
      return null;
  }
}

function renderTableCells(item: any, contentType: CollectionContentType, selection?: ItemSelection) {
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
          <td className="px-4 py-2 text-sm text-gray-600">
            {item.skus?.[0]?.sku || item.sku || 'N/A'}
          </td>
          <td className="px-4 py-2 text-sm font-medium text-gray-900">
            ${(item.priceEntries?.[0]?.price || 0).toFixed(2)}
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
          <td className="px-4 py-2 text-sm text-gray-600">
            {item.estimatedHours || '-'}
          </td>
          <td className="px-4 py-2 text-sm font-medium text-gray-900">
            {selection?.unitPrice ? `$${selection.unitPrice.toFixed(2)}` : '-'}
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
          <td className="px-4 py-2 text-sm text-gray-600">
            {item.skus?.[0]?.sku || item.sku || 'N/A'}
          </td>
          <td className="px-4 py-2 text-sm font-medium text-gray-900">
            ${(item.priceEntries?.[0]?.price || 0).toFixed(2)}
          </td>
          <td className="px-4 py-2">
            <div className={`text-sm font-medium ${
              item.onHand === 0 ? 'text-red-600' : item.onHand <= item.minStock ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {item.onHand || 0}
            </div>
          </td>
          <td className="px-4 py-2 text-sm text-gray-600">{item.location || '-'}</td>
        </>
      );
    default:
      return null;
  }
}

export default CategoryTabView;