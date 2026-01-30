// src/mainComponents/ui/StatusBadge.tsx

import React from 'react';
import { Clock } from 'lucide-react';

interface StatusBadgeProps {
    status: string;
    type?: 'default' | 'with-icon';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'default' }) => {
    const getStatusConfig = (status: string) => {
        const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-');

        switch (normalizedStatus) {
            // Purchase Order statuses
            case 'pending':
                return {
                    bgColor: 'bg-yellow-50',
                    textColor: 'text-yellow-700',
                    borderColor: 'border-yellow-200',
                    label: 'Pending',
                    showIcon: true
                };
            case 'ordered':
                return {
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-700',
                    borderColor: 'border-blue-200',
                    label: 'Ordered',
                    showIcon: false
                };
            case 'received':
                return {
                    bgColor: 'bg-green-50',
                    textColor: 'text-green-700',
                    borderColor: 'border-green-200',
                    label: 'Received',
                    showIcon: false
                };
            case 'cancelled':
                return {
                    bgColor: 'bg-red-50',
                    textColor: 'text-red-700',
                    borderColor: 'border-red-200',
                    label: 'Cancelled',
                    showIcon: false
                };

            // Work Order statuses
            case 'completed':
                return {
                    bgColor: 'bg-green-50',
                    textColor: 'text-green-700',
                    borderColor: 'border-green-200',
                    label: 'Completed',
                    showIcon: false
                };
            case 'in-progress':
                return {
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-700',
                    borderColor: 'border-blue-200',
                    label: 'In Progress',
                    showIcon: false
                };
            case 'review':
                return {
                    bgColor: 'bg-purple-50',
                    textColor: 'text-purple-700',
                    borderColor: 'border-purple-200',
                    label: 'Review',
                    showIcon: false
                };
            case 'revisions':
                return {
                    bgColor: 'bg-orange-50',
                    textColor: 'text-orange-700',
                    borderColor: 'border-orange-200',
                    label: 'Revisions',
                    showIcon: false
                };

            // Estimate statuses
            case 'sent':
                return {
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-700',
                    borderColor: 'border-blue-200',
                    label: 'Sent',
                    showIcon: false
                };
            case 'viewed':
                return {
                    bgColor: 'bg-purple-50',
                    textColor: 'text-purple-700',
                    borderColor: 'border-purple-200',
                    label: 'Viewed',
                    showIcon: false
                };
            case 'accepted':
                return {
                    bgColor: 'bg-green-50',
                    textColor: 'text-green-700',
                    borderColor: 'border-green-200',
                    label: 'Accepted',
                    showIcon: false
                };
            case 'denied':
                return {
                    bgColor: 'bg-red-50',
                    textColor: 'text-red-700',
                    borderColor: 'border-red-200',
                    label: 'Denied',
                    showIcon: false
                };
            case 'on-hold':
                return {
                    bgColor: 'bg-yellow-50',
                    textColor: 'text-yellow-700',
                    borderColor: 'border-yellow-200',
                    label: 'On Hold',
                    showIcon: false
                };
            case 'expired':
                return {
                    bgColor: 'bg-orange-50',
                    textColor: 'text-orange-700',
                    borderColor: 'border-orange-200',
                    label: 'Expired',
                    showIcon: false
                };
            case 'draft':
                return {
                    bgColor: 'bg-gray-50',
                    textColor: 'text-gray-700',
                    borderColor: 'border-gray-200',
                    label: 'Draft',
                    showIcon: false
                };
            case 'estimate':
                return {
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-700',
                    borderColor: 'border-blue-200',
                    label: 'Estimate',
                    showIcon: false
                };
            case 'invoice':
                return {
                    bgColor: 'bg-green-50',
                    textColor: 'text-green-700',
                    borderColor: 'border-green-200',
                    label: 'Invoice',
                    showIcon: false
                };
            case 'change-order':
                return {
                    bgColor: 'bg-orange-50',
                    textColor: 'text-orange-700',
                    borderColor: 'border-orange-200',
                    label: 'Change Order',
                    showIcon: false
                };

            default:
                return {
                    bgColor: 'bg-gray-50',
                    textColor: 'text-gray-700',
                    borderColor: 'border-gray-200',
                    label: status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                    showIcon: false
                };
        }
    };

    const config = getStatusConfig(status);
    const shouldShowIcon = type === 'with-icon' && config.showIcon;

    return (
        <span
            className={`
        inline-flex items-center gap-1.5
        px-3 py-1.5 
        text-xs font-medium 
        rounded-full 
        border
        ${config.bgColor}
        ${config.textColor}
        ${config.borderColor}
      `}
        >
            {shouldShowIcon && <Clock className="w-3.5 h-3.5" />}
            {config.label}
        </span>
    );
};

export default StatusBadge;