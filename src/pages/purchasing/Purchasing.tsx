// src/pages/purchasing/Purchasing.tsx

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Filter } from 'lucide-react';
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

const Purchasing: React.FC = () => {
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

  const handleCreateManualPO = () => {
    setIsCreatingPO(true);
  };

  const handleCreateSuccess = () => {
    setIsCreatingPO(false);
    // The list will auto-update via subscription
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
          onBack={() => setIsCreatingPO(false)} 
          onSuccess={handleCreateSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-sm text-white p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <ShoppingCart className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Purchasing</h1>
              <p className="text-orange-100 text-lg">
                Manage purchase orders and inventory procurement
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateManualPO}
            className="mt-4 sm:mt-0 bg-white text-orange-600 px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors flex items-center space-x-2 font-medium shadow-sm"
          >
            <Plus className="h-5 w-5" />
            <span>Create Manual P.O.</span>
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-sm text-orange-100">Total P.O.s</div>
              <div className="text-2xl font-bold text-white">{stats.totalPOs}</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-sm text-orange-100">Pending</div>
              <div className="text-2xl font-bold text-white">{stats.pendingCount}</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-sm text-orange-100">Ordered</div>
              <div className="text-2xl font-bold text-white">{stats.orderedCount}</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-sm text-orange-100">Received</div>
              <div className="text-2xl font-bold text-white">{stats.receivedCount}</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-sm text-orange-100">Total Value</div>
              <div className="text-2xl font-bold text-white">
                ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}
      </div>

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
        />
      )}
    </div>
  );
};

export default Purchasing;
