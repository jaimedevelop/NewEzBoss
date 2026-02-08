import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

interface FinancesSummaryCardsProps {
    currentCashPosition: number;
    monthlyBurnRate: number;
    lifestyleRequirement: number;
    monthStatus: 'on-track' | 'warning' | 'critical';
}

const FinancesSummaryCards: React.FC<FinancesSummaryCardsProps> = ({
    currentCashPosition,
    monthlyBurnRate,
    lifestyleRequirement,
    monthStatus
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusConfig = () => {
        switch (monthStatus) {
            case 'on-track':
                return {
                    label: 'On Track',
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    icon: CheckCircle
                };
            case 'warning':
                return {
                    label: 'Warning',
                    color: 'text-yellow-600',
                    bgColor: 'bg-yellow-50',
                    borderColor: 'border-yellow-200',
                    icon: AlertCircle
                };
            case 'critical':
                return {
                    label: 'Critical',
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    icon: AlertCircle
                };
        }
    };

    const statusConfig = getStatusConfig();
    const StatusIcon = statusConfig.icon;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Current Cash Position */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Current Cash Position</span>
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <DollarSign size={20} className="text-blue-600" />
                    </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(currentCashPosition)}
                </div>
            </div>

            {/* Monthly Burn Rate */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Monthly Burn Rate</span>
                    <div className="p-2 bg-red-50 rounded-lg">
                        <TrendingDown size={20} className="text-red-600" />
                    </div>
                </div>
                <div className="text-3xl font-bold text-red-600">
                    {formatCurrency(monthlyBurnRate)}
                </div>
            </div>

            {/* Lifestyle Requirement */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Lifestyle Requirement</span>
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <TrendingUp size={20} className="text-purple-600" />
                    </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(lifestyleRequirement)}
                    <span className="text-sm text-gray-500 font-normal">/mo</span>
                </div>
            </div>

            {/* This Month Status */}
            <div className={`rounded-2xl border ${statusConfig.borderColor} ${statusConfig.bgColor} p-6 shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">This Month Status</span>
                    <div className={`p-2 ${statusConfig.bgColor} rounded-lg`}>
                        <StatusIcon size={20} className={statusConfig.color} />
                    </div>
                </div>
                <div className={`text-3xl font-bold ${statusConfig.color}`}>
                    {statusConfig.label}
                </div>
            </div>
        </div>
    );
};

export default FinancesSummaryCards;
