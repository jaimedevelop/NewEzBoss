// src/pages/purchasing/components/PurchaseOrdersList.tsx

import React, { useState } from 'react';
import { FileText, Calendar, DollarSign, Package, ExternalLink, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PurchaseOrderWithId } from '../../../services/purchasing';
import PurchaseOrderStatusBadge from './PurchaseOrderStatusBadge';
import PurchaseOrderModal from './PurchaseOrderModal';

interface PurchaseOrdersListProps {
  purchaseOrders: PurchaseOrderWithId[];
  onDelete: (poId: string) => void;
}

const PurchaseOrdersList: React.FC<PurchaseOrdersListProps> = ({ purchaseOrders, onDelete }) => {
  const navigate = useNavigate();
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderWithId | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePOClick = (po: PurchaseOrderWithId) => {
    setSelectedPO(po);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPO(null);
  };

  if (purchaseOrders.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Package className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Orders Yet</h3>
          <p className="text-gray-500 max-w-md">
            Purchase orders will be automatically generated when estimates are accepted and inventory needs restocking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P.O. Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchaseOrders.map((po) => (
                <tr
                  key={po.id}
                  onClick={() => handlePOClick(po)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{po.poNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/estimates/${po.estimateId}`);
                      }}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {po.estimateNumber}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {po.orderDate}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PurchaseOrderStatusBadge status={po.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <Package className="w-4 h-4 text-gray-400" />
                      {po.items.length} {po.items.length === 1 ? 'item' : 'items'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      {po.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this purchase order?')) {
                          onDelete(po.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                      title="Delete Purchase Order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Order Modal */}
      {selectedPO && (
        <PurchaseOrderModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          purchaseOrder={selectedPO}
        />
      )}
    </>
  );
};

export default PurchaseOrdersList;
