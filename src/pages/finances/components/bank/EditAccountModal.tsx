import React, { useState } from 'react';
import { X, Landmark, DollarSign, List, CreditCard } from 'lucide-react';
import { BankAccount } from '../../../../services/finances/bank';

interface EditAccountModalProps {
    account: BankAccount;
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<BankAccount>) => void;
}

const EditAccountModal: React.FC<EditAccountModalProps> = ({ account, onClose, onUpdate }) => {
    const [name, setName] = useState(account.name);
    const [type, setType] = useState(account.type);
    const [balance, setBalance] = useState(account.balance.toString());
    const [currency, setCurrency] = useState(account.currency);
    const [accountNumber, setAccountNumber] = useState(account.accountNumber || '');
    const [institution, setInstitution] = useState(account.institution || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!account.id) return;

        setIsSubmitting(true);
        try {
            await onUpdate(account.id, {
                name,
                type,
                balance: parseFloat(balance) || 0,
                currency,
                accountNumber,
                institution,
            });
            onClose();
        } catch (error) {
            console.error('Error updating account:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Landmark className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Edit Account</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/80 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Account Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                            Account Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50/50"
                            placeholder="e.g., Main Checking"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Account Type */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Account Type
                            </label>
                            <div className="relative">
                                <List className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as any)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none bg-gray-50/50 appearance-none"
                                >
                                    <option value="Checking">Checking</option>
                                    <option value="Savings">Savings</option>
                                    <option value="Credit Card">Credit Card</option>
                                    <option value="Investment">Investment</option>
                                </select>
                            </div>
                        </div>

                        {/* Currency */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Currency
                            </label>
                            <input
                                type="text"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none bg-gray-50/50"
                                placeholder="USD"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Current Balance */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Current Balance <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    value={balance}
                                    onChange={(e) => setBalance(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none bg-gray-50/50"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Institution */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Institution <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={institution}
                                onChange={(e) => setInstitution(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none bg-gray-50/50"
                                placeholder="e.g., Chase"
                            />
                        </div>
                    </div>

                    {/* Account Number */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                            Account Number <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none bg-gray-50/50"
                                placeholder="Last 4 digits or any identifier"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 flex items-center justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && (
                                <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditAccountModal;
