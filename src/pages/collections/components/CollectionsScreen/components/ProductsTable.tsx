// src/pages/collections/components/CollectionsScreen/components/ProductsTable.tsx
import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import ProductRow from './ProductRow';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  subcategory: string;
  unitPrice?: number;
  price?: number;
  onHand?: number;
  quantity?: number;
  location: string;
  addedQuantity?: number;
}

interface ProductsTableProps {
  products: Product[];
  isEditing: boolean;
  isLoading: boolean;
  loadError: string | null;
  selectedProducts: Set<string>;
  searchQuery: string;
  onToggleSelection: (productId: string) => void;
  onToggleAllSelection: () => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRetry: () => void;
}

const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  isEditing,
  isLoading,
  loadError,
  selectedProducts,
  searchQuery,
  onToggleSelection,
  onToggleAllSelection,
  onQuantityChange,
  onRetry,
}) => {
  const allSelected = products.length > 0 && selectedProducts.size === products.length;

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {isEditing && (
              <th className="px-6 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAllSelection}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
              </th>
            )}
            <th className="px-6 py-3">Product</th>
            <th className="px-6 py-3">SKU</th>
            <th className="px-6 py-3">Category</th>
            <th className="px-6 py-3">Price</th>
            <th className="px-6 py-3">Stock</th>
            <th className="px-6 py-3">Location</th>
            {isEditing && <th className="px-6 py-3">Add Qty</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={isEditing ? 8 : 7} className="px-6 py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-2" />
                <p className="text-gray-500">Loading products...</p>
              </td>
            </tr>
          ) : loadError ? (
            <tr>
              <td colSpan={isEditing ? 8 : 7} className="px-6 py-12 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600">{loadError}</p>
                <button 
                  onClick={onRetry}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Try again
                </button>
              </td>
            </tr>
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={isEditing ? 8 : 7} className="px-6 py-12 text-center text-gray-500">
                {searchQuery ? 'No products match your search' : 'No products found for the selected categories'}
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                isEditing={isEditing}
                isSelected={selectedProducts.has(product.id)}
                onToggleSelection={onToggleSelection}
                onQuantityChange={onQuantityChange}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProductsTable;