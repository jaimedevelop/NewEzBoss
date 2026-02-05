import React, { useState, useEffect } from 'react';
import BankSummary from './BankSummary';
import AccountsSection from './AccountsSection';
import AddAccountModal from './AddAccountModal';
import EditAccountModal from './EditAccountModal';
import BankAccountDashboard from './BankAccountDashboard';
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
                // In a real app, you'd show a toast here
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

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-blue-600 border-b-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (selectedAccount) {
        return (
            <div className="p-8 max-w-[1600px] mx-auto">
                <BankAccountDashboard
                    account={selectedAccount}
                    onBack={() => setSelectedAccount(null)}
                />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Summary Section */}
            <BankSummary />

            {/* Accounts Section */}
            <AccountsSection
                accounts={accounts}
                onAddAccount={() => setIsAddModalOpen(true)}
                onEditAccount={setEditingAccount}
                onDeleteAccount={setDeletingAccount}
                onSelectAccount={setSelectedAccount}
            />

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
