// src/pages/collections/components/CollectionsScreen/components/CollectionSummary.tsx
import React from 'react';
import { Package, Briefcase, Wrench, Truck, DollarSign, Layers } from 'lucide-react';
import type { CategoryTab, ItemSelection, CollectionContentType } from '../../../../../services/collections';

interface CollectionSummaryProps {
  collectionName: string;
  taxRate: number;
  
  // Products
  productCategoryTabs: CategoryTab[];
  allProducts: any[];
  productSelections: Record<string, ItemSelection>;
  
  // Labor
  laborCategoryTabs: CategoryTab[];
  allLaborItems: any[];
  laborSelections: Record<string, ItemSelection>;
  
  // Tools
  toolCategoryTabs: CategoryTab[];
  allToolItems: any[];
  toolSelections: Record<string, ItemSelection>;
  
  // Equipment
  equipmentCategoryTabs: CategoryTab[];
  allEquipmentItems: any[];
  equipmentSelections: Record<string, ItemSelection>;
}

const CollectionSummary: React.FC<CollectionSummaryProps> = ({
  collectionName,
  taxRate,
  productCategoryTabs,
  allProducts,
  productSelections,
  laborCategoryTabs,
  allLaborItems,
  laborSelections,
  toolCategoryTabs,
  allToolItems,
  toolSelections,
  equipmentCategoryTabs,
  allEquipmentItems,
  equipmentSelections,
}) => {
  // Calculate totals for each content type
  const calculateTypeTotal = (
    items: any[],
    selections: Record<string, ItemSelection>,
    contentType: CollectionContentType
  ) => {
    const selectedItems = items.filter(item => selections[item.id]?.isSelected);
    const itemCount = selectedItems.length;
    
    const subtotal = selectedItems.reduce((sum, item) => {
      const selection = selections[item.id];
      const price = getItemPrice(item, contentType, selection);
      return sum + (price * selection.quantity);
    }, 0);
    
    return { itemCount, subtotal };
  };

  // Get price for different content types
  function getItemPrice(item: any, contentType: CollectionContentType, selection?: ItemSelection): number {
    if (selection?.unitPrice) return selection.unitPrice;
    
    switch (contentType) {
      case 'products':
        return item.priceEntries?.[0]?.price || item.unitPrice || 0;
      case 'labor':
        return item.flatRates?.[0]?.rate || item.hourlyRates?.[0]?.hourlyRate || 0;
      case 'tools':
      case 'equipment':
        return item.minimumCustomerCharge || 0;
      default:
        return 0;
    }
  }

  const productsData = calculateTypeTotal(allProducts, productSelections, 'products');
  const laborData = calculateTypeTotal(allLaborItems, laborSelections, 'labor');
  const toolsData = calculateTypeTotal(allToolItems, toolSelections, 'tools');
  const equipmentData = calculateTypeTotal(allEquipmentItems, equipmentSelections, 'equipment');

  const totalSubtotal = productsData.subtotal + laborData.subtotal + toolsData.subtotal + equipmentData.subtotal;
  const totalItems = productsData.itemCount + laborData.itemCount + toolsData.itemCount + equipmentData.itemCount;
  const tax = totalSubtotal * taxRate;
  const grandTotal = totalSubtotal + tax;

  const contentTypes = [
    {
      label: 'Products',
      icon: Package,
      color: 'blue',
      data: productsData,
      categories: productCategoryTabs.length,
    },
    {
      label: 'Labor',
      icon: Briefcase,
      color: 'purple',
      data: laborData,
      categories: laborCategoryTabs.length,
    },
    {
      label: 'Tools',
      icon: Wrench,
      color: 'orange',
      data: toolsData,
      categories: toolCategoryTabs.length,
    },
    {
      label: 'Equipment',
      icon: Truck,
      color: 'green',
      data: equipmentData,
      categories: equipmentCategoryTabs.length,
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', icon: 'text-blue-600' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', icon: 'text-purple-600' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', icon: 'text-orange-600' },
      green: { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200', icon: 'text-green-600' },
    };
    return colors[color];
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Collection Summary</h2>
            <p className="text-sm text-gray-600">{collectionName}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Layers className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No Items Selected
            </h3>
            <p className="text-gray-500">
              Add items from Products, Labor, Tools, or Equipment tabs to see your collection summary
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <Layers className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Subtotal</p>
                    <p className="text-2xl font-bold text-gray-900">${totalSubtotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Grand Total</p>
                    <p className="text-2xl font-bold text-orange-600">${grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown by Type */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Breakdown by Type</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {contentTypes.map((type) => {
                  if (type.data.itemCount === 0) return null;
                  
                  const Icon = type.icon;
                  const colors = getColorClasses(type.color);
                  const percentage = totalSubtotal > 0 ? (type.data.subtotal / totalSubtotal) * 100 : 0;

                  return (
                    <div key={type.label} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 ${colors.bg} rounded-lg`}>
                            <Icon className={`w-5 h-5 ${colors.icon}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{type.label}</h4>
                            <p className="text-sm text-gray-600">
                              {type.data.itemCount} items • {type.categories} categories
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            ${type.data.subtotal.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {percentage.toFixed(1)}% of total
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors.bg.replace('50', '400')}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Final Totals */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-indigo-200">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-6 py-3 text-gray-700 font-medium">Subtotal</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      ${totalSubtotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-6 py-3 text-gray-700 font-medium">
                      Tax ({(taxRate * 100).toFixed(1)}%)
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      ${tax.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-indigo-50">
                    <td className="px-6 py-4 text-indigo-900 font-bold text-lg">GRAND TOTAL</td>
                    <td className="px-6 py-4 text-right text-indigo-900 font-bold text-xl">
                      ${grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionSummary;