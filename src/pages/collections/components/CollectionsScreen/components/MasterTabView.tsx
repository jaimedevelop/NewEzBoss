// src/pages/collections/components/CollectionsScreen/components/MasterTabView.tsx
import React from 'react';
import { Package, DollarSign, Layers } from 'lucide-react';
import type { InventoryProduct } from '../../../../../services/products';
import type { ProductSelection, CategoryTab } from '../../../../../services/collections';

interface MasterTabViewProps {
  collectionName: string;
  categoryTabs: CategoryTab[];
  allProducts: InventoryProduct[];
  productSelections: Record<string, ProductSelection>;
  taxRate: number; // decimal format (0.07 = 7%)
  onQuantityChange: (productId: string, quantity: number) => void;
}

const MasterTabView: React.FC<MasterTabViewProps> = ({
  collectionName,
  categoryTabs,
  allProducts,
  productSelections,
  taxRate,
  onQuantityChange,
}) => {
  // Get selected products with their data (allProducts is already filtered)
  const selectedProductsData = allProducts
    .filter(p => productSelections[p.id!]?.isSelected)
    .map(p => ({
      ...p,
      selection: productSelections[p.id!],
    }));

  // Calculate totals
  const totalProducts = selectedProductsData.length;
  const totalQuantity = selectedProductsData.reduce((sum, p) => sum + p.selection.quantity, 0);
  const subtotalValue = selectedProductsData.reduce((sum, p) => {
    const price = p.priceEntries?.[0]?.price || 0;
    return sum + (price * p.selection.quantity);
  }, 0);
  const taxAmount = subtotalValue * taxRate;
  const totalValue = subtotalValue + taxAmount;

  // Group by category for the table
  const categoryGroups = categoryTabs.map(tab => {
    const tabProducts = selectedProductsData.filter(p => 
      p.selection.categoryTabId === tab.id
    );
    
    const categorySubtotal = tabProducts.reduce((sum, p) => {
      const price = p.priceEntries?.[0]?.price || 0;
      return sum + (price * p.selection.quantity);
    }, 0);
    
    const categoryTax = categorySubtotal * taxRate;
    const categoryTotal = categorySubtotal + categoryTax;
    
    return {
      tab,
      productCount: tabProducts.length,
      subtotal: categorySubtotal,
      tax: categoryTax,
      total: categoryTotal,
    };
  }).filter(group => group.productCount > 0);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Summary Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">    
        <div className="flex items-center gap-8 text-sm">
          {/* Total Products */}
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-600" />
            <span className="text-gray-600">Products:</span>
            <span className="font-semibold text-gray-900">{totalProducts}</span>
          </div>

          {/* Total Quantity */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="text-gray-600">Quantity:</span>
            <span className="font-semibold text-gray-900">{totalQuantity}</span>
          </div>

          {/* Total Value */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-gray-600">Total Value:</span>
            <span className="font-semibold text-gray-900">${totalValue.toFixed(2)}</span>
            <span className="text-xs text-gray-500">(incl. {(taxRate * 100).toFixed(1)}% tax)</span>
          </div>
        </div>
      </div>

      {/* Category Summary Table */}
      <div className="flex-1 overflow-auto p-6">
        {categoryGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No Products Selected
            </h3>
            <p className="text-gray-500">
              Go to category tabs to select products for this collection
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2 text-right">Products</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                  <th className="px-4 py-2 text-right">Tax</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categoryGroups.map((group) => (
                  <tr key={group.tab.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{group.tab.name}</div>
                      <div className="text-xs text-gray-500">
                        {group.tab.subcategories.join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded-full">
                        {group.productCount}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      ${group.subtotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-gray-600">
                      ${group.tax.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">
                      ${group.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
                
                {/* Totals Row */}
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                  <td className="px-4 py-2 text-gray-900">TOTAL</td>
                  <td className="px-4 py-2 text-right">
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-orange-900 bg-orange-200 rounded-full">
                      {totalProducts}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-900">
                    ${subtotalValue.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-900">
                    ${taxAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-lg text-green-700">
                    ${totalValue.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterTabView;