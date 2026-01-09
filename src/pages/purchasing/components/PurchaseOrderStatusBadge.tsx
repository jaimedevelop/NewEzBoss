// src/pages/purchasing/components/PurchaseOrderStatusBadge.tsx

import React from 'react';
import { Clock, Truck, CheckCircle, XCircle, Package } from 'lucide-react';
import type { PurchaseOrderStatus } from '../../../services/purchasing';

interface PurchaseOrderStatusBadgeProps {
  status: PurchaseOrderStatus;
  className?: string;
}

const PurchaseOrderStatusBadge: React.FC<PurchaseOrderStatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending',
          icon: Clock,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-300',
        };
      case 'ordered':
        return {
          label: 'Ordered',
          icon: Truck,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-300',
        };
      case 'partially-received':
        return {
          label: 'Partially Received',
          icon: Package,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-300',
        };
      case 'received':
        return {
          label: 'Received',
          icon: CheckCircle,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          icon: XCircle,
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300',
        };
      default:
        return {
          label: status,
          icon: Clock,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-300',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-lg border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
};

export default PurchaseOrderStatusBadge;
