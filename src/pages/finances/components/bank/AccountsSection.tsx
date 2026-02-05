import React from 'react';
import { Plus, Landmark, MoreVertical, CreditCard, Building2, Wallet } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { type BankAccount } from '../../../../services/finances/bank';

interface AccountsSectionProps {
    accounts: BankAccount[];
    onAddAccount: () => void;
    onEditAccount: (account: BankAccount) => void;
    onDeleteAccount: (account: BankAccount) => void;
    onSelectAccount: (account: BankAccount) => void;
}

const AccountCard: React.FC<{
    account: BankAccount;
    onEdit: () => void;
    onDelete: () => void;
    onSelect: () => void;
}> = ({ account, onEdit, onDelete, onSelect }) => {
    const [showDropdown, setShowDropdown] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'Credit Card': return <CreditCard className="w-5 h-5" />;
            case 'Savings': return <Wallet className="w-5 h-5" />;
            case 'Investment': return <Building2 className="w-5 h-5" />;
            default: return <Landmark className="w-5 h-5" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Credit Card': return 'text-orange-600 bg-orange-50';
            case 'Savings': return 'text-emerald-600 bg-emerald-50';
            case 'Investment': return 'text-indigo-600 bg-indigo-50';
            default: return 'text-blue-600 bg-blue-50';
        }
    };

    return (
        <div
            onClick={onSelect}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-blue-500 cursor-pointer relative"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${getTypeColor(account.type)} transition-colors`}>
                        {getIcon(account.type)}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight text-sm">
                            {account.name}
                        </h3>
                        <p className="text-xs font-medium text-gray-500">{account.institution || 'Other'}</p>
                    </div>
                </div>
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(!showDropdown);
                        }}
                        className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-10 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                    setShowDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                            >
                                Edit Account
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                    setShowDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                            >
                                Delete Account
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-gray-900">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency }).format(account.balance)}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getTypeColor(account.type)} uppercase`}>
                        {account.type}
                    </span>
                    {account.accountNumber && (
                        <span className="text-[10px] font-medium text-gray-400">
                            •••• {account.accountNumber.slice(-4)}
                        </span>
                    )}
                </div>
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-medium italic">
                    Updated {account.lastUpdated instanceof Timestamp
                        ? account.lastUpdated.toDate().toLocaleDateString()
                        : new Date(account.lastUpdated).toLocaleDateString()}
                </span>
                <button className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                    View Activity
                </button>
            </div>
        </div>
    );
};

const AccountsSection: React.FC<AccountsSectionProps> = ({
    accounts,
    onAddAccount,
    onEditAccount,
    onDeleteAccount,
    onSelectAccount
}) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        Connected Accounts
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-bold">
                            {accounts.length}
                        </span>
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">Manage your bank accounts and credit cards</p>
                </div>
                <button
                    onClick={onAddAccount}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98] group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    <span>Add Account</span>
                </button>
            </div>

            {accounts.length === 0 ? (
                <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center group hover:border-blue-300 transition-colors cursor-pointer" onClick={onAddAccount}>
                    <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Landmark className="w-10 h-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No accounts added yet</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6 font-medium">
                        Add your first bank account or credit card to start tracking your finances.
                    </p>
                    <button className="text-blue-600 font-bold hover:underline decoration-2 underline-offset-4">
                        Click here to add one
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts.map(account => (
                        <AccountCard
                            key={account.id}
                            account={account}
                            onEdit={() => onEditAccount(account)}
                            onDelete={() => onDeleteAccount(account)}
                            onSelect={() => onSelectAccount(account)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AccountsSection;
