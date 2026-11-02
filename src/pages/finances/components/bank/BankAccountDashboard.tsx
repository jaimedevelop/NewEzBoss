import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BankAccount } from '../../../../services/finances/bank';
import TransactionsTab from './TransactionsTab';
import StatementImportsTab from './StatementImportsTab';
import { Transaction, subscribeToTransactions } from '../../../../services/finances/bank/transactions';

interface BankAccountDashboardProps {
    account: BankAccount;
    onBack: () => void;
}

const BankAccountDashboard: React.FC<BankAccountDashboardProps> = ({ account, onBack }) => {
    const [activeTab, setActiveTab] = useState<'transactions' | 'imports'>('transactions');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [retry,setRetry] = useState(0);
    useEffect(() => {
        setLoading(true);setError(null);setTransactions([]);
        return subscribeToTransactions(account.id!,rows=>{setTransactions(rows);setLoading(false);setError(null);},message=>{setError(message);setLoading(false);});
    }, [account.id,retry]);
    const fetchTransactions=()=>setRetry(value=>value+1);

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            {error && <div role="alert">{error} <button type="button" onClick={fetchTransactions}>Retry</button></div>}
            {loading && <p role="status">Loading transactions…</p>}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                            {account.name}
                        </h1>
                        <p className="text-sm font-medium text-gray-500">
                            {account.institution || 'No Institution'} • •••• {account.accountNumber?.slice(-4) || 'XXXX'}
                        </p>
                    </div>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-end">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Balance</span>
                    <span className="text-2xl font-black text-blue-600">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency }).format(account.balance)}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-8 border-b border-gray-100 mb-8">
                <button
                    onClick={() => setActiveTab('transactions')}
                    className={`pb - 4 text - sm font - bold transition - all relative ${activeTab === 'transactions' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'} `}
                >
                    Transactions
                    {activeTab === 'transactions' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('imports')}
                    className={`pb - 4 text - sm font - bold transition - all relative ${activeTab === 'imports' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'} `}
                >
                    Statement Imports
                    {activeTab === 'imports' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
            </div>

            {activeTab === 'transactions' ? (
                <TransactionsTab
                    transactions={transactions}
                    currency={account.currency}
                    onNavigateToImports={() => setActiveTab('imports')}
                />
            ) : (
                <StatementImportsTab
                    bankAccountId={account.id!}
                    onImportSuccess={() => {
                        fetchTransactions();
                        setActiveTab('transactions');
                    }}
                />
            )}
        </div>
    );
};

export default BankAccountDashboard;
