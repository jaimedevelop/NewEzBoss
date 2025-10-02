// src/pages/collections/components/CollectionsScreen/components/ProductRow.tsx
import React from 'react';

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

interface ProductRowProps {
  product: Product;
  isEditing: boolean;
  isSelected: boolean;
  onToggleSelection: (productId: string) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  isEditing,
  isSelected,
  onToggleSelection,
  onQuantityChange,
}) => {
  const stockQuantity = product.onHand || product.quantity || 0;
  const price = product.unitPrice || product.price || 0;

  const getStockColorClass = (quantity: number) => {
    if (quantity > 10) return 'bg-green-100 text-green-800';
    if (quantity > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <tr className="hover:bg-gray-50">
      {isEditing && (
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(product.id)}
            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
          />
        </td>
      )}
      <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
      <td className="px-6 py-4 text-gray-600">{product.sku}</td>
      <td className="px-6 py-4">
        <div>
          <div className="text-gray-900">{product.category}</div>
          <div className="text-xs text-gray-500">{product.subcategory}</div>
        </div>
      </td>
      <td className="px-6 py-4 text-gray-900">${price.toFixed(2)}</td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded-full text-xs ${getStockColorClass(stockQuantity)}`}>
          {stockQuantity} units
        </span>
      </td>
      <td className="px-6 py-4 text-gray-600">{product.location}</td>
      {isEditing && (
        <td className="px-6 py-4">
          <input
            type="number"
            min="0"
            value={product.addedQuantity || 0}
            onChange={(e) => onQuantityChange(product.id, parseInt(e.target.value) || 0)}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
            disabled={!isSelected}
          />
        </td>
      )}
    </tr>
  );
};

export default ProductRow;