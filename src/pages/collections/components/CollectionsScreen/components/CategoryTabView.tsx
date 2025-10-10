import React, { useMemo, useState, useCallback } from 'react';
import { Loader2, AlertCircle, Package } from 'lucide-react';
import type { InventoryProduct } from '../../../../../services/products';
import type { ProductSelection } from '../../../../../services/collections';

interface CategoryTabViewProps {
  categoryName: string;
  subcategories: string[];
  products: InventoryProduct[];
  productSelections: Record<string, ProductSelection>;
  isLoading: boolean;
  loadError: string | null;
  onToggleSelection: (productId: string) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRetry: () => void;
}

const CategoryTabView: React.FC<CategoryTabViewProps> = ({
  categoryName,
  subcategories,
  products,
  productSelections,
  isLoading,
  loadError,
  onToggleSelection,
  onQuantityChange,
  onRetry,
}) => {
  // Local state for optimistic updates
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});

  // Group products by subcategory
  const productsBySubcategory = useMemo(() => {
    const grouped = new Map<string, InventoryProduct[]>();
    
    products.forEach(product => {
      const subcategory = product.subcategory;
      if (!grouped.has(subcategory)) {
        grouped.set(subcategory, []);
      }
      grouped.get(subcategory)!.push(product);
    });
    
    return grouped;
  }, [products]);

  // Sort subcategories - empty string first, then alphabetically
  const sortedSubcategories = useMemo(() => {
    return Array.from(productsBySubcategory.entries())
      .sort(([subA], [subB]) => {
        // Empty string comes first
        if (subA === '' && subB !== '') return -1;
        if (subA !== '' && subB === '') return 1;
        // Then alphabetically
        return subA.localeCompare(subB);
      });
  }, [productsBySubcategory]);

  // Calculate selection stats
  const allProducts = Array.from(productsBySubcategory.values()).flat();
  const selectedCount = allProducts.filter(p => productSelections[p.id!]?.isSelected).length;
  const totalValue = allProducts
    .filter(p => productSelections[p.id!]?.isSelected)
    .reduce((sum, p) => {
      const selection = productSelections[p.id!];
      const price = p.priceEntries?.[0]?.price || 0;
      return sum + (price * (selection?.quantity || 0));
    }, 0);

  // Handle quantity change with optimistic update
  const handleQuantityChange = useCallback((productId: string, value: string) => {
    const numValue = parseInt(value) || 1;
    const clampedValue = Math.max(1, numValue);
    
    // Optimistic update - instant UI feedback
    setLocalQuantities(prev => ({
      ...prev,
      [productId]: clampedValue,
    }));
  }, []);

  // Handle blur - trigger actual save
  const handleQuantityBlur = useCallback((productId: string) => {
    const localQty = localQuantities[productId];
    if (localQty !== undefined) {
      // Trigger parent's onChange which will debounce the save
      onQuantityChange(productId, localQty);
      
      // Clear local state after triggering save
      setLocalQuantities(prev => {
        const { [productId]: removed, ...rest } = prev;
        return rest;
      });
    }
  }, [localQuantities, onQuantityChange]);

  // Handle Enter key - trigger save
  const handleQuantityKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    productId: string
  ) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // Trigger blur event
    }
  }, []);

  // Get display quantity (local or saved)
  const getDisplayQuantity = useCallback((productId: string): number => {
    // Use local quantity if exists (user is typing)
    if (localQuantities[productId] !== undefined) {
      return localQuantities[productId];
    }
    // Otherwise use saved quantity
    return productSelections[productId]?.quantity || 1;
  }, [localQuantities, productSelections]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with stats */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{categoryName}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {subcategories.length} subcategor{subcategories.length === 1 ? 'y' : 'ies'}: {subcategories.join(', ')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-orange-600">{selectedCount}</span> of{' '}
              <span className="font-semibold">{allProducts.length}</span> selected
            </div>
            {selectedCount > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Total: ${totalValue.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products List - Grouped by Subcategory */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
            <p className="text-gray-500">Loading products...</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-red-600 mb-2">{loadError}</p>
            <button
              onClick={onRetry}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Try again
            </button>
          </div>
        ) : sortedSubcategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Package className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">
              No products match your filters
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2 w-12">
                  <input
                    type="checkbox"
                    checked={selectedCount === allProducts.length && allProducts.length > 0}
                    onChange={() => {
                      allProducts.forEach(p => {
                        const isCurrentlySelected = productSelections[p.id!]?.isSelected;
                        if (selectedCount === allProducts.length) {
                          if (isCurrentlySelected) onToggleSelection(p.id!);
                        } else {
                          if (!isCurrentlySelected) onToggleSelection(p.id!);
                        }
                      });
                    }}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                </th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2 w-24">Quantity</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedSubcategories.map(([subcategory, products]) => (
                <React.Fragment key={subcategory}>
                  {/* Subcategory Divider */}
                  <tr className="bg-blue-50 border-y border-blue-200">
                    <td colSpan={7} className="px-4 py-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                          {subcategory === '' ? 'No Subcategory' : subcategory}
                        </span>
                        <span className="text-xs text-blue-700">
                          {products.filter(p => productSelections[p.id!]?.isSelected).length} / {products.length} selected
                        </span>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Products in this subcategory */}
                  {products.map((product) => {
                    const selection = productSelections[product.id!];
                    const isSelected = selection?.isSelected || false;
                    const quantity = getDisplayQuantity(product.id!);
                    const price = product.priceEntries?.[0]?.price || 0;

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                          isSelected ? 'bg-orange-50' : ''
                        }`}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelection(product.id!)}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                              {product.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {product.skus?.[0]?.sku || product.sku || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          ${price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          <div
                            className={`text-sm font-medium ${
                              product.onHand === 0
                                ? 'text-red-600'
                                : product.onHand <= product.minStock
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            {product.onHand || 0}
                          </div>
                          <div className="text-xs text-gray-500">
                            Avail: {product.available || 0}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {product.location || '-'}
                        </td>
                        <td className="px-4 py-2">
                          {isSelected ? (
                            <input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => handleQuantityChange(product.id!, e.target.value)}
                              onBlur={() => handleQuantityBlur(product.id!)}
                              onKeyDown={(e) => handleQuantityKeyDown(e, product.id!)}
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

export default CategoryTabView;