// src/pages/collections/components/CollectionsScreen/components/CollectionSummary.tsx
import React, { useMemo } from 'react';
import { Package, Briefcase, Wrench, Truck, DollarSign, Layers } from 'lucide-react';
import type { CategoryTab, ItemSelection, CollectionContentType } from '../../../../../services/collections';
import CollectionCalculator from './CollectionCalculator';
import { saveCollectionCalculation } from '../../../../../services/collections';

interface CollectionSummaryProps {
  collectionId: string;
  collectionName: string;
  taxRate: number;
  savedCalculations?: any; // Saved calculations from the collection
  
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

// ===== HELPER FUNCTIONS =====

// Calculate labor COST (hourlyRates × hours × quantity)
function calculateLaborCost(laborItem: any, selection: ItemSelection): number {
  if (!laborItem.hourlyRates || laborItem.hourlyRates.length === 0) {
    return 0;
  }
  
  const totalHourlyRate = laborItem.hourlyRates.reduce((sum: number, rate: any) => 
    sum + (rate.hourlyRate || 0), 0
  );
  
  const hours = selection.estimatedHours ?? laborItem.estimatedHours ?? 0;
  
  return totalHourlyRate * hours * selection.quantity;
}

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

const CollectionSummary: React.FC<CollectionSummaryProps> = ({
  collectionId,
  collectionName,
  taxRate,
  savedCalculations,
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
  // Calculate totals for all content types
  const calculateTypeTotal = (
    items: any[],
    selections: Record<string, ItemSelection>,
    contentType: CollectionContentType
  ) => {
    const selectedItems = items.filter(item => selections[item.id]?.isSelected);
    const itemCount = selectedItems.length;
    
    let subtotal = 0;
    
    if (contentType === 'labor') {
      subtotal = selectedItems.reduce((sum, item) => {
        const selection = selections[item.id];
        return sum + calculateLaborCost(item, selection);
      }, 0);
    } else {
      subtotal = selectedItems.reduce((sum, item) => {
        const selection = selections[item.id];
        const price = getItemPrice(item, contentType, selection);
        return sum + (price * selection.quantity);
      }, 0);
    }
    
    return { itemCount, subtotal };
  };

  // Calculate labor REVENUE separately for the calculator
  const laborRevenue = useMemo(() => {
    const selectedItems = allLaborItems.filter(item => laborSelections[item.id]?.isSelected);
    return selectedItems.reduce((sum, item) => {
      const selection = laborSelections[item.id];
      const price = getItemPrice(item, 'labor', selection);
      return sum + (price * selection.quantity);
    }, 0);
  }, [allLaborItems, laborSelections]);

  // Track the selling price from calculator (initialize with laborRevenue)
  const [sellingPrice, setSellingPrice] = React.useState(laborRevenue);

  // Update sellingPrice when laborRevenue changes
  React.useEffect(() => {
    setSellingPrice(laborRevenue);
  }, [laborRevenue]);

  const productsData = calculateTypeTotal(allProducts, productSelections, 'products');
  const laborData = calculateTypeTotal(allLaborItems, laborSelections, 'labor');
  const toolsData = calculateTypeTotal(allToolItems, toolSelections, 'tools');
  const equipmentData = calculateTypeTotal(allEquipmentItems, equipmentSelections, 'equipment');

  // This is TOTAL COST (not grand total)
  const totalCost = productsData.subtotal + laborData.subtotal + toolsData.subtotal + equipmentData.subtotal;
  const totalItems = productsData.itemCount + laborData.itemCount + toolsData.itemCount + equipmentData.itemCount;

  // Profit calculations using sellingPrice from calculator
  const profit = useMemo(() => {
    return sellingPrice - totalCost;
  }, [sellingPrice, totalCost]);

  const profitMargin = useMemo(() => {
    if (sellingPrice === 0) return 0;
    return (profit / sellingPrice) * 100;
  }, [profit, sellingPrice]);

  const getProfitMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-yellow-600';
    if (margin >= 0) return 'text-orange-600';
    return 'text-red-600';
  };

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
    const colors: Record<string, any> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', icon: 'text-blue-600' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', icon: 'text-purple-600' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', icon: 'text-orange-600' },
      green: { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200', icon: 'text-green-600' },
    };
    return colors[color];
  };

  const handleSaveCalculation = async (calculation: any) => {
    const result = await saveCollectionCalculation(collectionId, calculation);
    if (result.success) {
      console.log('✅ Calculator saved to collection');
    } else {
      console.error('❌ Failed to save calculator:', result.error);
    }
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
                  <div className="p-3 bg-red-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold text-red-600">${totalCost.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Selling Price</p>
                    <p className="text-2xl font-bold text-green-600">${sellingPrice.toFixed(2)}</p>
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
                  const percentage = totalCost > 0 ? (type.data.subtotal / totalCost) * 100 : 0;

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
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
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

            {/* Cost Breakdown */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-red-200">
              <div className="bg-red-50 px-6 py-3 border-b border-red-200">
                <h3 className="text-lg font-semibold text-red-900">Cost Breakdown</h3>
              </div>
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-6 py-3 text-gray-700 font-medium">Products</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      ${productsData.subtotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-6 py-3 text-gray-700 font-medium">Labor</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      ${laborData.subtotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-6 py-3 text-gray-700 font-medium">Tools</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      ${toolsData.subtotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-6 py-3 text-gray-700 font-medium">Equipment</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      ${equipmentData.subtotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="px-6 py-4 text-red-900 font-bold text-lg">TOTAL COST</td>
                    <td className="px-6 py-4 text-right text-red-900 font-bold text-xl">
                      ${totalCost.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Profit Analysis - ALWAYS ACTIVE */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-emerald-200">
              <div className="bg-emerald-50 px-6 py-3 border-b border-emerald-200">
                <h3 className="text-lg font-semibold text-emerald-900">Profit Analysis</h3>
              </div>
              <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-medium text-gray-700">Selling Price:</span>
                    <span className="font-bold text-green-600">${sellingPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="font-medium text-gray-700">Total Cost:</span>
                    <span className="font-bold text-red-600">${totalCost.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-gray-300 my-3"></div>
                  <div className="flex justify-between text-xl pt-2">
                    <span className="font-bold text-gray-900">Profit:</span>
                    <span className={`font-bold text-2xl ${
                      profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {profit > 0 ? '+' : ''}${profit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xl">
                    <span className="font-bold text-gray-900">Profit Margin:</span>
                    <span className={`font-bold text-2xl ${getProfitMarginColor(profitMargin)}`}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* Profit Margin Guide */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                      <span className="text-green-600 font-semibold">30%+</span> Excellent • 
                      <span className="text-yellow-600 font-semibold"> 15-30%</span> Good • 
                      <span className="text-orange-600 font-semibold"> 0-15%</span> Low • 
                      <span className="text-red-600 font-semibold"> &lt;0%</span> Loss
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculator */}
            <CollectionCalculator
              collectionId={collectionId}
              initialFinalSalePrice={laborRevenue}
              productsTotal={productsData.subtotal}
              laborTotal={laborData.subtotal}
              toolsTotal={toolsData.subtotal}
              equipmentTotal={equipmentData.subtotal}
              taxRate={taxRate}
              savedCalculations={savedCalculations}
              onSave={handleSaveCalculation}
              onFinalSalePriceChange={setSellingPrice}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionSummary;