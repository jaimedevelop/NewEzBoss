// src/pages/purchasing/Purchasing.tsx

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, Plus, Filter } from 'lucide-react';
import { Alert } from '../../mainComponents/ui/Alert';
import {
  subscribeToPurchaseOrders,
  getPurchaseOrderStats,
  type PurchaseOrderWithId,
  type PurchaseOrderFilters,
  type PurchaseOrderStats,
  deletePurchaseOrder,
} from '../../services/purchasing';
import PurchaseOrdersList from './components/PurchaseOrdersList';
import CreatePurchaseOrder from './components/CreatePurchaseOrder';
import VariableHeader from '../../mainComponents/ui/VariableHeader';

const Purchasing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const poId = searchParams.get('poId');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithId[]>([]);
  const [stats, setStats] = useState<PurchaseOrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PurchaseOrderFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrderWithId | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Subscribe to purchase orders
  useEffect(() => {
    const filterParams: PurchaseOrderFilters = {
      ...filters,
      searchTerm: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter as any : undefined,
    };

    const unsubscribe = subscribeToPurchaseOrders(
      (pos) => {
        setPurchaseOrders(pos);
        setLoading(false);
      },
      filterParams
    );

    return () => unsubscribe();
  }, [filters, searchTerm, statusFilter]);

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      const result = await getPurchaseOrderStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    };
    loadStats();
  }, [purchaseOrders]); // Reload stats when P.O.s change

  // Auto-hide success banner
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => {
        setSuccessBanner(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  const handleCreateManualPO = () => {
    setEditingPO(null);
    setIsCreatingPO(true);
  };

  const handleEditPO = (po: PurchaseOrderWithId) => {
    setEditingPO(po);
    setIsCreatingPO(true);
  };

  const handleCreateSuccess = () => {
    setIsCreatingPO(false);
    setEditingPO(null);
    setSuccessBanner(`Purchase order ${editingPO ? 'updated' : 'created'} successfully!`);
  };

  const handleDeletePO = async (poId: string) => {
    const result = await deletePurchaseOrder(poId);
    if (!result.success) {
      alert('Failed to delete purchase order');
    }
  };

  if (isCreatingPO) {
    return (
      <div className="space-y-6">
        <CreatePurchaseOrder
          onBack={() => {
            setIsCreatingPO(false);
            setEditingPO(null);
          }}
          onSuccess={handleCreateSuccess}
          editPO={editingPO || undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {successBanner && (
        <Alert
          type="success"
          message={successBanner}
          onClose={() => setSuccessBanner(null)}
          className="shadow-md"
        />
      )}
      {/* Header */}
      <VariableHeader
        title="Purchasing"
        subtitle="Manage purchase orders and inventory procurement"
        Icon={ShoppingCart}
        rightAction={{
          label: "Create Manual P.O.",
          onClick: handleCreateManualPO,
          Icon: Plus
        }}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-orange-600" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="P.O. number, estimate, supplier..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="ordered">Ordered</option>
              <option value="partially-received">Partially Received</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters({ ...filters, sortBy: sortBy as any, sortOrder: sortOrder as any });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="createdAt-desc">Creation Date (Newest First)</option>
              <option value="createdAt-asc">Creation Date (Oldest First)</option>
              <option value="orderDate-desc">Order Date (Newest First)</option>
              <option value="orderDate-asc">Order Date (Oldest First)</option>
              <option value="poNumber-desc">P.O. Number (Desc)</option>
              <option value="poNumber-asc">P.O. Number (Asc)</option>
              <option value="total-desc">Total (High to Low)</option>
              <option value="total-asc">Total (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading purchase orders...</div>
          </div>
        </div>
      ) : (
        <PurchaseOrdersList
          purchaseOrders={purchaseOrders}
          onDelete={handleDeletePO}
          onEdit={handleEditPO}
          initialPoId={poId}
        />
      )}
    </div>
  );
};

export default Purchasing;
