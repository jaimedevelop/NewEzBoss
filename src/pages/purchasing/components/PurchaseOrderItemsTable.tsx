// src/pages/purchasing/components/PurchaseOrderItemsTable.tsx

import React from 'react';
import { AlertCircle, Package } from 'lucide-react';
import type { PurchaseOrderItem } from '../../../services/purchasing';

interface PurchaseOrderItemsTableProps {
  items: PurchaseOrderItem[];
}

const PurchaseOrderItemsTable: React.FC<PurchaseOrderItemsTableProps> = ({ items }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Needed</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Ordered</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Received</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Est. Price</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid Price</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diff</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className={item.notInInventory ? 'bg-yellow-50' : ''}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {item.notInInventory && (
                    <AlertCircle className="w-4 h-4 text-yellow-600" title="Not in inventory" />
                  )}
                  <span className="text-sm font-medium text-gray-900">{item.productName}</span>
                </div>
                {item.notInInventory && (
                  <div className="text-xs text-yellow-700 mt-1">{item.notes}</div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{item.sku || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantityNeeded}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{item.quantityOrdered}</td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                {item.quantityReceived > 0 ? (
                  <span className="text-green-600 font-medium">{item.quantityReceived}</span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                ${item.unitPrice.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                {item.actualUnitPrice ? (
                  <span className="font-medium">${item.actualUnitPrice.toFixed(2)}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {item.actualUnitPrice ? (
                  (() => {
                    const diff = item.actualUnitPrice - item.unitPrice;
                    const isSavings = diff < 0;

                    if (diff === 0) return <span className="text-gray-500">-</span>;

                    return (
                      <span className={isSavings ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                {(() => {
                  const effectivePrice = item.actualUnitPrice ?? item.unitPrice;
                  const total = item.quantityOrdered * effectivePrice;
                  return `$${total.toFixed(2)}`;
                })()}
              </td>
              <td className="px-4 py-3 text-center">
                {item.isReceived ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                    <Package className="w-3 h-3" />
                    Received
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PurchaseOrderItemsTable;
