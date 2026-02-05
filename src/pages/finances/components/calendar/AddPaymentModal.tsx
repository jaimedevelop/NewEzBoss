import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, DollarSign, Repeat, FileText, Tag } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
    FinanceCategory,
    PaymentType,
    RecurringFrequency,
    createPayment,
    subscribeToFinanceCategories
} from '../../../../services/finances';
import { Timestamp } from 'firebase/firestore';

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ isOpen, onClose }) => {
    const { currentUser } = useAuthContext();
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [description, setDescription] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');

    useEffect(() => {
        if (currentUser?.uid && isOpen) {
            const unsubscribe = subscribeToFinanceCategories(currentUser.uid, setCategories);
            return () => unsubscribe();
        }
    }, [currentUser, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.uid || !title || !amount || !categoryId || !dueDate) return;

        const result = await createPayment({
            userId: currentUser.uid,
            title,
            amount: parseFloat(amount),
            categoryId,
            dueDate: Timestamp.fromDate(new Date(dueDate)),
            description,
            type: isRecurring ? 'recurring' : 'one-time',
            isRecurring,
            recurringDetails: isRecurring ? { frequency } : undefined,
            status: 'pending'
        });

        if (result.success) {
            resetForm();
            onClose();
        }
    };

    const resetForm = () => {
        setTitle('');
        setAmount('');
        setCategoryId('');
        setDueDate('');
        setDescription('');
        setIsRecurring(false);
        setFrequency('monthly');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                        Add New Payment
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-900">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <Tag size={16} className="text-gray-400" /> Payment Title
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                            placeholder="e.g., Office Rent"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                <DollarSign size={16} className="text-gray-400" /> Amount
                            </label>
                            <input
                                type="number"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                <CalendarIcon size={16} className="text-gray-400" /> Due Date
                            </label>
                            <input
                                type="date"
                                required
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                        <select
                            required
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                        >
                            <option value="">Select a category...</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name} ({cat.type})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <FileText size={16} className="text-gray-400" /> Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all h-24 resize-none"
                            placeholder="Optional notes..."
                        />
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`relative w-12 h-6 rounded-full transition-colors ${isRecurring ? 'bg-orange-500' : 'bg-gray-200'}`}>
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={isRecurring}
                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                />
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors flex items-center gap-2">
                                <Repeat size={16} /> Recurring Payment
                            </span>
                        </label>
                    </div>

                    {isRecurring && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Frequency</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['weekly', 'monthly', 'yearly'] as const).map(f => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setFrequency(f)}
                                        className={`py-2 px-1 rounded-lg text-xs font-bold capitalize transition-all border ${frequency === f
                                                ? 'bg-orange-50 border-orange-500 text-orange-600'
                                                : 'bg-white border-gray-200 text-gray-500 hover:border-orange-200'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
                        >
                            Save Payment
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPaymentModal;
