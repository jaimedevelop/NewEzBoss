// src/pages/collections/components/CollectionsScreen/components/MasterTabView.tsx
import React from 'react';
import { Package, DollarSign, Layers, Briefcase, Wrench, Truck } from 'lucide-react';
import type { CategoryTab, ItemSelection, CollectionContentType } from '../../../../../services/collections';

interface MasterTabViewProps {
  collectionName: string;
  taxRate: number;
  activeContentType: CollectionContentType; // ✅ ADD THIS
  
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
  
  onQuantityChange?: (itemId: string, quantity: number) => void;
}

const MasterTabView: React.FC<MasterTabViewProps> = ({
  collectionName,
  taxRate,
  activeContentType, // ✅ USE THIS
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
  // ✅ Filter data based on active content type
  const getCurrentTypeData = () => {
    switch (activeContentType) {
      case 'products':
        return {
          tabs: productCategoryTabs,
          items: allProducts,
          selections: productSelections,
          icon: Package,
          color: 'blue',
          label: 'Products',
        };
      case 'labor':
        return {
          tabs: laborCategoryTabs,
          items: allLaborItems,
          selections: laborSelections,
          icon: Briefcase,
          color: 'purple',
          label: 'Labor',
        };
      case 'tools':
        return {
          tabs: toolCategoryTabs,
          items: allToolItems,
          selections: toolSelections,
          icon: Wrench,
          color: 'orange',
          label: 'Tools',
        };
      case 'equipment':
        return {
          tabs: equipmentCategoryTabs,
          items: allEquipmentItems,
          selections: equipmentSelections,
          icon: Truck,
          color: 'green',
          label: 'Equipment',
        };
    }
  };

  const { tabs, items, selections, icon: Icon, color, label } = getCurrentTypeData();

  // Calculate totals for current type only
  const groups = tabs.map(tab => {
    const tabItems = items.filter(item => 
      selections[item.id]?.isSelected && selections[item.id]?.categoryTabId === tab.id
    );
    
    const subtotal = tabItems.reduce((sum, item) => {
      const selection = selections[item.id];
      const price = getItemPrice(item, activeContentType, selection);
      return sum + (price * selection.quantity);
    }, 0);
    
    return { tab, items: tabItems, subtotal };
  }).filter(g => g.items.length > 0);

  const subtotal = groups.reduce((sum, g) => sum + g.subtotal, 0);
  const itemCount = groups.reduce((sum, g) => sum + g.items.length, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const hasItems = itemCount > 0;

  // ✅ Color classes based on active type
  const getColorClasses = () => {
    const colors = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', badge: 'bg-blue-200 text-blue-900' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', badge: 'bg-purple-200 text-purple-900' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', badge: 'bg-orange-200 text-orange-900' },
      green: { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200', badge: 'bg-green-200 text-green-900' },
    };
    return colors[color];
  };

  const colorClasses = getColorClasses();

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Summary Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">    
        <div className="flex items-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 text-${color}-600`} />
            <span className="text-gray-600 font-medium">{label}:</span>
            <span className="font-semibold text-gray-900">{itemCount} items</span>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-gray-600">Total:</span>
            <span className="font-semibold text-gray-900">${total.toFixed(2)}</span>
            <span className="text-xs text-gray-500">(incl. {(taxRate * 100).toFixed(1)}% tax)</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Icon className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No {label} Selected
            </h3>
            <p className="text-gray-500">
              Use the category tabs below to select {label.toLowerCase()}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Items Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 text-${color}-600`} />
                <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
                <span className="text-sm text-gray-500">({itemCount} items)</span>
              </div>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2 text-right">Items</th>
                      <th className="px-4 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {groups.map((group) => (
                      <tr key={group.tab.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900">{group.tab.name}</div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-${color}-800 bg-${color}-100 rounded-full`}>
                            {group.items.length}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">
                          ${group.subtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className={`${colorClasses.bg} font-semibold`}>
                      <td className={`px-4 py-2 ${colorClasses.text}`}>{label} Subtotal</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold ${colorClasses.badge} rounded-full`}>
                          {itemCount}
                        </span>
                      </td>
                      <td className={`px-4 py-2 text-right ${colorClasses.text}`}>
                        ${subtotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-orange-200">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-gray-700 font-medium">Subtotal</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ${subtotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      Tax ({(taxRate * 100).toFixed(1)}%)
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ${tax.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-orange-50">
                    <td className="px-4 py-4 text-orange-900 font-bold text-lg">TOTAL</td>
                    <td className="px-4 py-4 text-right text-orange-900 font-bold text-xl">
                      ${total.toFixed(2)}
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

// Helper function to get item price based on content type
function getItemPrice(item: any, contentType: CollectionContentType, selection?: ItemSelection): number {
  // If price is cached in selection, use that
  if (selection?.unitPrice) return selection.unitPrice;
  
  // Otherwise, get price from item based on content type
  switch (contentType) {
    case 'products':
      return item.priceEntries?.[0]?.price || item.unitPrice || 0;
    
    case 'labor':
      // Try flat rate first, then hourly rate
      return item.flatRates?.[0]?.rate || item.hourlyRates?.[0]?.hourlyRate || 0;
    
    case 'tools':
    case 'equipment':
      return item.minimumCustomerCharge || 0;
    
    default:
      return 0;
  }
}

export default MasterTabView;