import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

interface BudgetSummaryProps {
    totalIncome: number;
    totalExpenses: number;
    budgetedIncome: number;
    budgetedExpenses: number;
}

const BudgetSummary: React.FC<BudgetSummaryProps> = ({
    totalIncome,
    totalExpenses,
    budgetedIncome,
    budgetedExpenses
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const incomeProgress = budgetedIncome > 0 ? (totalIncome / budgetedIncome) * 100 : 0;
    const expenseProgress = budgetedExpenses > 0 ? (totalExpenses / budgetedExpenses) * 100 : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Income Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp size={64} className="text-emerald-600" />
                </div>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Actual Income</p>
                        <h4 className="text-2xl font-bold text-gray-900">{formatCurrency(totalIncome)}</h4>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Goal: {formatCurrency(budgetedIncome)}</span>
                        <span className={`font-medium ${incomeProgress >= 100 ? 'text-emerald-600' : 'text-orange-600'}`}>
                            {incomeProgress.toFixed(0)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-500 ${incomeProgress >= 100 ? 'bg-emerald-500' : 'bg-orange-400'}`}
                            style={{ width: `${Math.min(incomeProgress, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Total Expenses Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingDown size={64} className="text-red-600" />
                </div>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Actual Expenses</p>
                        <h4 className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</h4>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Budget: {formatCurrency(budgetedExpenses)}</span>
                        <span className={`font-medium ${expenseProgress > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {expenseProgress.toFixed(0)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-500 ${expenseProgress > 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(expenseProgress, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Net Status Card */}
            <div className="md:col-span-2 bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-2xl shadow-lg relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 p-6 opacity-20">
                    <Wallet size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-orange-100 font-medium">Net Financial Health</p>
                        <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                            Current Status
                        </div>
                    </div>
                    <div className="flex items-end gap-3">
                        <h4 className="text-4xl font-black">{formatCurrency(totalIncome - totalExpenses)}</h4>
                        <p className="text-orange-100 mb-1 font-medium">
                            {totalIncome - totalExpenses >= 0 ? 'Surplus' : 'Deficit'} this month
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetSummary;
