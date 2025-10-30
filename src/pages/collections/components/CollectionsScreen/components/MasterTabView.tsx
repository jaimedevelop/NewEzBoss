// src/pages/collections/components/CollectionsScreen/components/MasterTabView.tsx
import React from 'react';
import { Package, DollarSign, Layers, Briefcase, Wrench, Truck } from 'lucide-react';
import type { CategoryTab, ItemSelection } from '../../../../../services/collections';

interface MasterTabViewProps {
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
  
  onQuantityChange?: (itemId: string, quantity: number) => void;
}

const MasterTabView: React.FC<MasterTabViewProps> = ({
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
  // Calculate product totals
  const productGroups = productCategoryTabs.map(tab => {
    const tabProducts = allProducts.filter(p => 
      productSelections[p.id]?.isSelected && productSelections[p.id]?.categoryTabId === tab.id
    );
    
    const subtotal = tabProducts.reduce((sum, p) => {
      const selection = productSelections[p.id];
      const price = p.priceEntries?.[0]?.price || 0;
      return sum + (price * selection.quantity);
    }, 0);
    
    return { tab, items: tabProducts, subtotal };
  }).filter(g => g.items.length > 0);

  const productSubtotal = productGroups.reduce((sum, g) => sum + g.subtotal, 0);
  const productCount = productGroups.reduce((sum, g) => sum + g.items.length, 0);

  // Calculate labor totals
  const laborGroups = laborCategoryTabs.map(tab => {
    const tabLabor = allLaborItems.filter(l => 
      laborSelections[l.id]?.isSelected && laborSelections[l.id]?.categoryTabId === tab.id
    );
    
    const subtotal = tabLabor.reduce((sum, l) => {
      const selection = laborSelections[l.id];
      // Use cached unit price or calculate from labor rates
      const price = selection.unitPrice || 0;
      return sum + (price * selection.quantity);
    }, 0);
    
    return { tab, items: tabLabor, subtotal };
  }).filter(g => g.items.length > 0);

  const laborSubtotal = laborGroups.reduce((sum, g) => sum + g.subtotal, 0);
  const laborCount = laborGroups.reduce((sum, g) => sum + g.items.length, 0);

  // Calculate tool totals
  const toolGroups = toolCategoryTabs.map(tab => {
    const tabTools = allToolItems.filter(t => 
      toolSelections[t.id]?.isSelected && toolSelections[t.id]?.categoryTabId === tab.id
    );
    
    const subtotal = tabTools.reduce((sum, t) => {
      const selection = toolSelections[t.id];
      const price = t.priceEntries?.[0]?.price || 0;
      return sum + (price * selection.quantity);
    }, 0);
    
    return { tab, items: tabTools, subtotal };
  }).filter(g => g.items.length > 0);

  const toolSubtotal = toolGroups.reduce((sum, g) => sum + g.subtotal, 0);
  const toolCount = toolGroups.reduce((sum, g) => sum + g.items.length, 0);

  // Calculate equipment totals
  const equipmentGroups = equipmentCategoryTabs.map(tab => {
    const tabEquipment = allEquipmentItems.filter(e => 
      equipmentSelections[e.id]?.isSelected && equipmentSelections[e.id]?.categoryTabId === tab.id
    );
    
    const subtotal = tabEquipment.reduce((sum, e) => {
      const selection = equipmentSelections[e.id];
      const price = e.priceEntries?.[0]?.price || 0;
      return sum + (price * selection.quantity);
    }, 0);
    
    return { tab, items: tabEquipment, subtotal };
  }).filter(g => g.items.length > 0);

  const equipmentSubtotal = equipmentGroups.reduce((sum, g) => sum + g.subtotal, 0);
  const equipmentCount = equipmentGroups.reduce((sum, g) => sum + g.items.length, 0);

  // Grand totals
  const grandSubtotal = productSubtotal + laborSubtotal + toolSubtotal + equipmentSubtotal;
  const grandTax = grandSubtotal * taxRate;
  const grandTotal = grandSubtotal + grandTax;
  const totalItems = productCount + laborCount + toolCount + equipmentCount;

  const hasAnyItems = totalItems > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Summary Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">    
        <div className="flex items-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-600" />
            <span className="text-gray-600">Total Items:</span>
            <span className="font-semibold text-gray-900">{totalItems}</span>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-gray-600">Grand Total:</span>
            <span className="font-semibold text-gray-900">${grandTotal.toFixed(2)}</span>
            <span className="text-xs text-gray-500">(incl. {(taxRate * 100).toFixed(1)}% tax)</span>
          </div>

          <div className="flex items-center gap-4 ml-auto text-xs">
            {productCount > 0 && (
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 text-blue-600" />
                <span className="text-gray-600">{productCount} Products</span>
              </div>
            )}
            {laborCount > 0 && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-purple-600" />
                <span className="text-gray-600">{laborCount} Labor</span>
              </div>
            )}
            {toolCount > 0 && (
              <div className="flex items-center gap-1">
                <Wrench className="w-3 h-3 text-orange-600" />
                <span className="text-gray-600">{toolCount} Tools</span>
              </div>
            )}
            {equipmentCount > 0 && (
              <div className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-green-600" />
                <span className="text-gray-600">{equipmentCount} Equipment</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!hasAnyItems ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No Items Selected
            </h3>
            <p className="text-gray-500">
              Use the tabs above to select products, labor, tools, or equipment
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Products Section */}
            {productGroups.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Products</h3>
                  <span className="text-sm text-gray-500">({productCount} items)</span>
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
                      {productGroups.map((group) => (
                        <tr key={group.tab.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-900">{group.tab.name}</div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
                              {group.items.length}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900">
                            ${group.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 font-semibold">
                        <td className="px-4 py-2 text-blue-900">Products Subtotal</td>
                        <td className="px-4 py-2 text-right">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-blue-900 bg-blue-200 rounded-full">
                            {productCount}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-blue-900">
                          ${productSubtotal.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Labor Section */}
            {laborGroups.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Labor</h3>
                  <span className="text-sm text-gray-500">({laborCount} items)</span>
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
                      {laborGroups.map((group) => (
                        <tr key={group.tab.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-900">{group.tab.name}</div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full">
                              {group.items.length}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900">
                            ${group.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-purple-50 font-semibold">
                        <td className="px-4 py-2 text-purple-900">Labor Subtotal</td>
                        <td className="px-4 py-2 text-right">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-purple-900 bg-purple-200 rounded-full">
                            {laborCount}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-purple-900">
                          ${laborSubtotal.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tools Section */}
            {toolGroups.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Tools</h3>
                  <span className="text-sm text-gray-500">({toolCount} items)</span>
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
                      {toolGroups.map((group) => (
                        <tr key={group.tab.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-900">{group.tab.name}</div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded-full">
                              {group.items.length}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900">
                            ${group.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-orange-50 font-semibold">
                        <td className="px-4 py-2 text-orange-900">Tools Subtotal</td>
                        <td className="px-4 py-2 text-right">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-orange-900 bg-orange-200 rounded-full">
                            {toolCount}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-orange-900">
                          ${toolSubtotal.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Equipment Section */}
            {equipmentGroups.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Equipment</h3>
                  <span className="text-sm text-gray-500">({equipmentCount} items)</span>
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
                      {equipmentGroups.map((group) => (
                        <tr key={group.tab.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-900">{group.tab.name}</div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                              {group.items.length}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900">
                            ${group.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-50 font-semibold">
                        <td className="px-4 py-2 text-green-900">Equipment Subtotal</td>
                        <td className="px-4 py-2 text-right">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-green-900 bg-green-200 rounded-full">
                            {equipmentCount}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-green-900">
                          ${equipmentSubtotal.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Grand Total */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-orange-200">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-gray-700 font-medium">Subtotal</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ${grandSubtotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      Tax ({(taxRate * 100).toFixed(1)}%)
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ${grandTax.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-orange-50">
                    <td className="px-4 py-4 text-orange-900 font-bold text-lg">GRAND TOTAL</td>
                    <td className="px-4 py-4 text-right text-orange-900 font-bold text-xl">
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

export default MasterTabView;