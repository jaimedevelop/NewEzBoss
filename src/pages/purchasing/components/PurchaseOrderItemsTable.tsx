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
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
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
                ${item.actualUnitPrice?.toFixed(2) || item.unitPrice.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                ${item.totalCost.toFixed(2)}
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
