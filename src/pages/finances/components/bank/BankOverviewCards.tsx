import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface BankOverviewCardsProps {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    netChange: number;
}

const BankOverviewCards: React.FC<BankOverviewCardsProps> = ({
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    netChange
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Balance */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Total Balance</span>
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <DollarSign size={20} className="text-blue-600" />
                    </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(totalBalance)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Across all accounts</p>
            </div>

            {/* Monthly Income */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Monthly Income</span>
                    <div className="p-2 bg-green-50 rounded-lg">
                        <TrendingUp size={20} className="text-green-600" />
                    </div>
                </div>
                <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(monthlyIncome)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Actual received this month</p>
            </div>

            {/* Monthly Expenses */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Monthly Expenses</span>
                    <div className="p-2 bg-red-50 rounded-lg">
                        <TrendingDown size={20} className="text-red-600" />
                    </div>
                </div>
                <div className="text-3xl font-bold text-red-600">
                    {formatCurrency(Math.abs(monthlyExpenses))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Actual spent this month</p>
            </div>

            {/* Net Change */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Net Change</span>
                    <div className={`p-2 rounded-lg ${netChange >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <Activity size={20} className={netChange >= 0 ? 'text-green-600' : 'text-red-600'} />
                    </div>
                </div>
                <div className={`text-3xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
                </div>
                <p className="text-xs text-gray-500 mt-1">This month</p>
            </div>
        </div>
    );
};

export default BankOverviewCards;
