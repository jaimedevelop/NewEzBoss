import React from 'react';
import { ArrowUpRight, ArrowDownLeft, MoreHorizontal } from 'lucide-react';

export interface Transaction {
    id: string;
    date: Date;
    description: string;
    amount: number;
    category: string;
    status: string;
}

interface TransactionListProps {
    transactions: Transaction[];
    currency: string;
    onNavigateToImports: () => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, currency, onNavigateToImports }) => {
    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-gray-50 p-4 rounded-full mb-4">
                    <ArrowUpRight className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No transactions available</h3>
                <p className="text-gray-500 mb-6 max-w-sm">
                    Do you wish to connect a bank or import a bank statement?
                </p>
                <button
                    onClick={onNavigateToImports}
                    className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-all"
                >
                    Go to Statement Imports
                </button>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                                {tx.date.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${tx.amount < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        {tx.amount < 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{tx.description}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-600 rounded-full uppercase">
                                    {tx.category}
                                </span>
                            </td>
                            <td className={`px-6 py-4 text-right font-black ${tx.amount < 0 ? 'text-gray-900' : 'text-green-600'}`}>
                                {tx.amount < 0 ? '-' : '+'}
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(Math.abs(tx.amount))}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <button className="p-1.5 hover:bg-white rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TransactionList;
