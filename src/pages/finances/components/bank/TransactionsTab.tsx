import React, { useState } from 'react';
import { Search, Filter, Tag } from 'lucide-react';
import TransactionList, { Transaction } from './TransactionList';
import TransactionCategoryManager from './TransactionCategoryManager';

interface TransactionsTabProps {
    transactions: Transaction[];
    currency: string;
    onNavigateToImports: () => void;
}

const TransactionsTab: React.FC<TransactionsTabProps> = ({ transactions, currency, onNavigateToImports }) => {
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-50 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsCategoryManagerOpen(true)}
                        className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-blue-600 flex items-center gap-2 text-sm font-bold transition-colors"
                    >
                        <Tag className="w-4 h-4" />
                        <span>Manage Categories</span>
                    </button>
                    <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 flex items-center gap-2 text-sm font-bold">
                        <Filter className="w-4 h-4" />
                        <span>Filter</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <TransactionList
                transactions={transactions}
                currency={currency}
                onNavigateToImports={onNavigateToImports}
            />

            <TransactionCategoryManager
                isOpen={isCategoryManagerOpen}
                onClose={() => setIsCategoryManagerOpen(false)}
            />
        </div>
    );
};

export default TransactionsTab;
