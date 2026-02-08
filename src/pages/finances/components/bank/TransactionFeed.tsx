import React, { useState } from 'react';
import { Search, Filter, Calendar } from 'lucide-react';

interface Transaction {
    id: string;
    date: Date;
    description: string;
    category: string;
    amount: number;
    account: string;
    type: 'income' | 'expense';
}

interface TransactionFeedProps {
    transactions?: Transaction[];
}

const TransactionFeed: React.FC<TransactionFeedProps> = ({ transactions = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedAccount, setSelectedAccount] = useState<string>('all');

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
            year: 'numeric',
        }).format(date);
    };

    // Filter transactions
    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = selectedType === 'all' || t.type === selectedType;
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        const matchesAccount = selectedAccount === 'all' || t.account === selectedAccount;

        return matchesSearch && matchesType && matchesCategory && matchesAccount;
    });

    // Get unique categories and accounts for filters
    const categories = ['all', ...Array.from(new Set(transactions.map(t => t.category)))];
    const accounts = ['all', ...Array.from(new Set(transactions.map(t => t.account)))];

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Transaction Feed</h3>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Search */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Type Filter */}
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as 'all' | 'income' | 'expense')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                </select>

                {/* Category Filter */}
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>
                            {cat === 'all' ? 'All Categories' : cat}
                        </option>
                    ))}
                </select>

                {/* Account Filter */}
                <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    {accounts.map(acc => (
                        <option key={acc} value={acc}>
                            {acc === 'all' ? 'All Accounts' : acc}
                        </option>
                    ))}
                </select>
            </div>

            {/* Transaction List */}
            <div className="space-y-2">
                {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction) => (
                        <div
                            key={transaction.id}
                            className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            {transaction.description}
                                        </p>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className="text-xs text-gray-500">{formatDate(transaction.date)}</span>
                                            <span className="text-xs text-gray-400">•</span>
                                            <span className="text-xs text-gray-500">{transaction.category}</span>
                                            <span className="text-xs text-gray-400">•</span>
                                            <span className="text-xs text-gray-500">{transaction.account}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <Filter size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No transactions found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                    </div>
                )}
            </div>

            {/* Pagination placeholder */}
            {filteredTransactions.length > 0 && (
                <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
};

export default TransactionFeed;
