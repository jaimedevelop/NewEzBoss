import React, { useState, useEffect } from 'react';
import { FileText, Plus, FolderOpen } from 'lucide-react';
import PageHeader from '../shared/PageHeader';
import BankOverviewCards from './BankOverviewCards';
import AccountsSection from './AccountsSection';
import AddAccountModal from './AddAccountModal';
import EditAccountModal from './EditAccountModal';
import BankAccountDashboard from './BankAccountDashboard';
import TransactionFeed from './TransactionFeed';
import DeleteConfirmationModal from '../../../../mainComponents/ui/DeleteConfirmationModal';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
    subscribeToBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    type BankAccount
} from '../../../../services/finances/bank';

const Bank: React.FC = () => {
    const { currentUser } = useAuthContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!currentUser?.uid) return;

        setIsLoading(true);
        const unsubscribe = subscribeToBankAccounts(currentUser.uid, (fetchedAccounts) => {
            setAccounts(fetchedAccounts);
            setIsLoading(false);

            // Update selected account if it was updated in Firestore
            if (selectedAccount) {
                const updated = fetchedAccounts.find(a => a.id === selectedAccount.id);
                if (updated) setSelectedAccount(updated);
            }
        });

        return () => unsubscribe();
    }, [currentUser?.uid, selectedAccount?.id]);

    const handleAddAccount = async (accountData: any) => {
        if (!currentUser?.uid) return;

        try {
            const result = await createBankAccount({
                userId: currentUser.uid,
                name: accountData.name,
                type: accountData.type,
                balance: accountData.balance,
                initialBalance: accountData.balance,
                currency: accountData.currency,
                accountNumber: accountData.accountNumber,
                institution: accountData.institution,
            });

            if (!result.success) {
                console.error('Failed to create account:', result.error);
            }
        } catch (error) {
            console.error('Error in handleAddAccount:', error);
        }
    };

    const handleUpdateAccount = async (id: string, updates: Partial<BankAccount>) => {
        try {
            const result = await updateBankAccount(id, updates);
            if (!result.success) {
                console.error('Failed to update account:', result.error);
            }
        } catch (error) {
            console.error('Error in handleUpdateAccount:', error);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletingAccount?.id) return;

        setIsProcessing(true);
        try {
            const result = await deleteBankAccount(deletingAccount.id);
            if (result.success) {
                setDeletingAccount(null);
            } else {
                console.error('Failed to delete account:', result.error);
            }
        } catch (error) {
            console.error('Error in handleDeleteAccount:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Calculate overview metrics (placeholder - will be replaced with real transaction data)
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const monthlyIncome = 2500; // Placeholder
    const monthlyExpenses = -1200; // Placeholder
    const netChange = monthlyIncome + monthlyExpenses;

    // Placeholder transactions
    const placeholderTransactions = [
        {
            id: '1',
            date: new Date(2026, 1, 5),
            description: 'Client Payment - Project ABC',
            category: 'Income',
            amount: 2500,
            account: 'Business Checking',
            type: 'income' as const
        },
        {
            id: '2',
            date: new Date(2026, 1, 4),
            description: 'Office Supplies - Staples',
            category: 'Office Expenses',
            amount: -150,
            account: 'Business Checking',
            type: 'expense' as const
        },
        {
            id: '3',
            date: new Date(2026, 1, 3),
            description: 'Contractor Payment - John Doe',
            category: 'Labor',
            amount: -800,
            account: 'Business Checking',
            type: 'expense' as const
        },
    ];

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-blue-600 border-b-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (selectedAccount) {
        return (
            <div className="max-w-[1600px] mx-auto">
                <BankAccountDashboard
                    account={selectedAccount}
                    onBack={() => setSelectedAccount(null)}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <PageHeader
                title="Bank Accounts"
                description="Track your accounts, transactions, and cash flow."
                breadcrumbs={[
                    { label: 'Financial Health', path: '/finances' },
                    { label: 'Bank Accounts', path: '/finances/bank' }
                ]}
                actions={
                    <>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={18} />
                            <span>Add Account</span>
                        </button>
                    </>
                }
            />

            <div className="max-w-[1600px] mx-auto p-8 space-y-8">
                {/* Overview Cards */}
                <BankOverviewCards
                    totalBalance={totalBalance}
                    monthlyIncome={monthlyIncome}
                    monthlyExpenses={monthlyExpenses}
                    netChange={netChange}
                />

                {/* Connected Accounts */}
                <AccountsSection
                    accounts={accounts}
                    onAddAccount={() => setIsAddModalOpen(true)}
                    onEditAccount={setEditingAccount}
                    onDeleteAccount={setDeletingAccount}
                    onSelectAccount={setSelectedAccount}
                />

                {/* Transaction Feed */}
                <TransactionFeed transactions={placeholderTransactions} />

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="flex items-center justify-center space-x-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                        <FileText size={20} className="text-blue-600" />
                        <span className="font-semibold text-gray-900">Import Statement</span>
                    </button>
                    <button className="flex items-center justify-center space-x-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                        <Plus size={20} className="text-green-600" />
                        <span className="font-semibold text-gray-900">Add Manual Transaction</span>
                    </button>
                    <button className="flex items-center justify-center space-x-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                        <FolderOpen size={20} className="text-purple-600" />
                        <span className="font-semibold text-gray-900">Manage Categories</span>
                    </button>
                </div>
            </div>

            {/* Modals */}
            {isAddModalOpen && (
                <AddAccountModal
                    onClose={() => setIsAddModalOpen(false)}
                    onAdd={handleAddAccount}
                />
            )}

            {editingAccount && (
                <EditAccountModal
                    account={editingAccount}
                    onClose={() => setEditingAccount(null)}
                    onUpdate={handleUpdateAccount}
                />
            )}

            <DeleteConfirmationModal
                isOpen={!!deletingAccount}
                isDeleting={isProcessing}
                title="Delete Bank Account"
                message={`Are you sure you want to delete "${deletingAccount?.name}"? All transaction history and data associated with this account will be permanently removed.`}
                onClose={() => setDeletingAccount(null)}
                onConfirm={handleDeleteAccount}
            />
        </div>
    );
};

export default Bank;
