import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet } from 'lucide-react';

interface BankAccountsHubCardProps {
    totalBalance: number;
    recentTransactions: Array<{
        id: string;
        description: string;
        amount: number;
        date: Date;
    }>;
}

const BankAccountsHubCard: React.FC<BankAccountsHubCardProps> = ({ totalBalance, recentTransactions }) => {
    const navigate = useNavigate();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
        }).format(date);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Wallet size={24} className="text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Bank Accounts</h3>
                </div>
            </div>

            {/* Total Balance */}
            <div className="mb-6">
                <p className="text-sm text-gray-600 mb-1">Total Balance</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalBalance)}</p>
            </div>

            {/* Recent Transactions */}
            <div className="space-y-3 mb-6">
                <p className="text-sm font-medium text-gray-700">Recent Transactions</p>
                {recentTransactions.length > 0 ? (
                    <div className="space-y-2">
                        {recentTransactions.slice(0, 5).map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {transaction.description}
                                    </p>
                                    <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                                </div>
                                <p className={`text-sm font-semibold ml-4 ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">No recent transactions</p>
                )}
            </div>

            {/* View All Link */}
            <button
                onClick={() => navigate('/finances/bank')}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-xl transition-colors"
            >
                <span>View All Accounts</span>
                <ArrowRight size={18} />
            </button>
        </div>
    );
};

export default BankAccountsHubCard;
