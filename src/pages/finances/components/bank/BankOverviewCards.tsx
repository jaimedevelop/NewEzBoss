import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface BankOverviewCardsProps {
    totalBalance: number | null;
    monthlyIncome: number | null;
    monthlyExpenses: number | null;
    netChange: number | null;
}

const BankOverviewCards: React.FC<BankOverviewCardsProps> = ({
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    netChange
}) => {
    const formatCurrency = (amount: number | null) => {
        if(amount===null)return '—';
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
                <p className="text-xs text-gray-500 mt-1">TODO: totals by currency</p>
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
                <p className="text-xs text-gray-500 mt-1">TODO: verified monthly income</p>
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
                    {formatCurrency(monthlyExpenses===null?null:Math.abs(monthlyExpenses))}
                </div>
                <p className="text-xs text-gray-500 mt-1">TODO: verified monthly spending</p>
            </div>

            {/* Net Change */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Net Change</span>
                    <div className={`p-2 rounded-lg ${(netChange ?? 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <Activity size={20} className={(netChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'} />
                    </div>
                </div>
                <div className={`text-3xl font-bold ${(netChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netChange!==null && netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
                </div>
                <p className="text-xs text-gray-500 mt-1">TODO: verified net change</p>
            </div>
        </div>
    );
};

export default BankOverviewCards;
