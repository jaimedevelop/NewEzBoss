// src/pages/collections/components/CollectionsScreen/components/MasterTabView.tsx
import React, { useState } from 'react';
import { Package, DollarSign, Layers, Briefcase, Wrench, Truck, Clock, AlertTriangle, Edit2, TrendingUp } from 'lucide-react';
import type { CategoryTab, ItemSelection, CollectionContentType } from '../../../../../services/collections';

interface MasterTabViewProps {
  collectionName: string;
  taxRate: number;
  activeContentType: CollectionContentType;
  
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
  onLaborHoursChange?: (itemId: string, hours: number) => void; 
  newlyAddedItemIds?: Set<string>;
}

// ===== HELPER FUNCTIONS =====

// Calculate hourly cost (sum of crew rates)
function calculateHourlyCost(laborItem: any): number | null {
  if (!laborItem.hourlyRates || laborItem.hourlyRates.length === 0) {
    return null;
  }
  return laborItem.hourlyRates.reduce((sum: number, rate: any) => sum + (rate.hourlyRate || 0), 0);
}

// Get estimated hours (check override first, then item default)
function getEstimatedHours(laborItem: any, selection?: ItemSelection): number {
  return selection?.estimatedHours ?? laborItem.estimatedHours ?? 0;
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

// Profit color based on margin
const getProfitColor = (margin: number) => {
  if (margin >= 40) return 'text-green-600';
  if (margin >= 20) return 'text-yellow-600';
  if (margin >= 0) return 'text-orange-600';
  return 'text-red-600';
};

const MasterTabView: React.FC<MasterTabViewProps> = ({
  collectionName,
  taxRate,
  activeContentType,
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
  onQuantityChange,
  onLaborHoursChange,
  newlyAddedItemIds,
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

  // ===== LABOR-SPECIFIC: Calculate totals with cost/profit =====
  const calculateLaborGroups = () => {
    return tabs.map(tab => {
      const tabItems = items.filter(item => 
        selections[item.id]?.isSelected && selections[item.id]?.categoryTabId === tab.id
      );
      
      let subtotal = 0;
      let laborCost = 0;
      let totalHours = 0;
      
      tabItems.forEach(item => {
        const selection = selections[item.id];
        const qty = selection.quantity;
        
        // Revenue (flat rate)
        const flatRate = getItemPrice(item, activeContentType, selection);
        subtotal += flatRate * qty;
        
        // Labor cost (only for labor items)
        if (activeContentType === 'labor') {
          const hourlyCost = calculateHourlyCost(item);
          const hours = getEstimatedHours(item, selection);
          
          if (hourlyCost !== null && hours > 0) {
            laborCost += hourlyCost * hours * qty;
            totalHours += hours * qty;
          }
        }
      });
      
      const profit = subtotal - laborCost;
      const profitMargin = subtotal > 0 ? (profit / subtotal) * 100 : 0;
      
      return { 
        tab, 
        items: tabItems, 
        subtotal,
        laborCost,
        totalHours,
        profit,
        profitMargin
      };
    }).filter(g => g.items.length > 0);
  };

  // Standard calculation for non-labor types
  const calculateStandardGroups = () => {
    return tabs.map(tab => {
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
  };

  const groups = activeContentType === 'labor' ? calculateLaborGroups() : calculateStandardGroups();
  
  const subtotal = groups.reduce((sum, g) => sum + g.subtotal, 0);
  const itemCount = groups.reduce((sum, g) => sum + g.items.length, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Labor-specific totals
  const totalLaborCost = activeContentType === 'labor' 
    ? groups.reduce((sum, g) => sum + (g.laborCost || 0), 0)
    : 0;
  const totalProfit = activeContentType === 'labor' ? subtotal - totalLaborCost : 0;
  const totalProfitMargin = activeContentType === 'labor' && subtotal > 0 
    ? (totalProfit / subtotal) * 100 
    : 0;

  const hasItems = itemCount > 0;

  // ✅ Color classes based on active type
  const getColorClasses = () => {
    const colors: Record<string, any> = {
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

          {/* ✅ Labor-specific profit indicator */}
          {activeContentType === 'labor' && totalLaborCost > 0 && (
            <div className="flex items-center gap-2">
              {totalProfit < 0 ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : (
                <TrendingUp className="w-4 h-4 text-green-600" />
              )}
              <span className="text-gray-600">Profit:</span>
              <span className={`font-semibold ${getProfitColor(totalProfitMargin)}`}>
                ${totalProfit.toFixed(2)} ({totalProfitMargin.toFixed(1)}%)
              </span>
            </div>
          )}
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
                      {activeContentType === 'labor' && (
                        <>
                          <th className="px-4 py-2 text-right">Hourly Cost</th>
                          <th className="px-4 py-2 text-right">Hours</th>
                          <th className="px-4 py-2 text-right">Labor Cost</th>
                        </>
                      )}
                      <th className="px-4 py-2 text-right">Revenue</th>
                      {activeContentType === 'labor' && (
                        <th className="px-4 py-2 text-right">Profit</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {groups.map((group: any) => (
                      <tr key={group.tab.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900">{group.tab.name}</div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-${color}-800 bg-${color}-100 rounded-full`}>
                            {group.items.length}
                          </span>
                        </td>
                        
                        {/* ✅ Labor-specific columns */}
                        {activeContentType === 'labor' && (
                          <>
                            <td className="px-4 py-2 text-right font-medium text-gray-700">
                              {group.laborCost > 0 ? (
                                `$${(group.laborCost / group.totalHours).toFixed(0)}/hr`
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-gray-700">
                              {group.totalHours > 0 ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  {group.totalHours.toFixed(1)}h
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-red-600">
                              {group.laborCost > 0 ? (
                                `$${group.laborCost.toFixed(2)}`
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </>
                        )}
                        
                        <td className="px-4 py-2 text-right font-medium text-gray-900">
                          ${group.subtotal.toFixed(2)}
                        </td>
                        
                        {/* ✅ Profit column for labor */}
                        {activeContentType === 'labor' && (
                          <td className="px-4 py-2 text-right">
                            {group.laborCost > 0 ? (
                              <div className="flex items-center justify-end gap-1">
                                {group.profit < 0 && (
                                  <AlertTriangle className="w-3 h-3 text-red-600" />
                                )}
                                <span className={`font-semibold ${getProfitColor(group.profitMargin)}`}>
                                  ${group.profit.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    
                    {/* Summary Row */}
                    <tr className={`${colorClasses.bg} font-semibold`}>
                      <td className={`px-4 py-2 ${colorClasses.text}`}>{label} Subtotal</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold ${colorClasses.badge} rounded-full`}>
                          {itemCount}
                        </span>
                      </td>
                      {activeContentType === 'labor' && (
                        <>
                          <td className="px-4 py-2 text-right text-gray-700">
                            {totalLaborCost > 0 && groups[0]?.totalHours > 0 ? (
                              `$${(totalLaborCost / groups.reduce((sum: number, g: any) => sum + g.totalHours, 0)).toFixed(0)}/hr`
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-700">
                            {groups.reduce((sum: number, g: any) => sum + g.totalHours, 0) > 0 ? (
                              `${groups.reduce((sum: number, g: any) => sum + g.totalHours, 0).toFixed(1)}h`
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className={`px-4 py-2 text-right text-red-600`}>
                            {totalLaborCost > 0 ? `$${totalLaborCost.toFixed(2)}` : '—'}
                          </td>
                        </>
                      )}
                      <td className={`px-4 py-2 text-right ${colorClasses.text}`}>
                        ${subtotal.toFixed(2)}
                      </td>
                      {activeContentType === 'labor' && (
                        <td className={`px-4 py-2 text-right ${getProfitColor(totalProfitMargin)}`}>
                          {totalLaborCost > 0 ? `$${totalProfit.toFixed(2)}` : '—'}
                        </td>
                      )}
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

export default MasterTabView;