import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Check, X, AlertCircle } from 'lucide-react';
import { Combobox } from '../../../../mainComponents/forms/Combobox';
import { parseBankStatementProperties, ParsedTransaction } from '../../../../services/finances/bank/pdfParser';
import { getTransactionCategories, TransactionCategory } from '../../../../services/finances/bank/transactionCategories';

import { bulkCreateTransactions } from '../../../../services/finances/bank/transactions';

interface StatementImportsTabProps {
    bankAccountId: string;
    onImportSuccess?: () => void;
}

const StatementImportsTab: React.FC<StatementImportsTabProps> = ({ bankAccountId, onImportSuccess }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
    const [view, setView] = useState<'upload' | 'review'>('upload');
    const [error, setError] = useState<string | null>(null);
    const [categories, setCategories] = useState<TransactionCategory[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const data = await getTransactionCategories();
        setCategories(data);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsParsing(true);
            setError(null);
            try {
                // Pass loaded categories to parser for auto-categorization
                const parsed = await parseBankStatementProperties(file, categories);
                if (parsed.length === 0) {
                    setError("No transactions found. Please ensure the PDF matches the expected format.");
                } else {
                    setTransactions(parsed);
                    setView('review');
                }
            } catch (err) {
                console.error("PDF Parse Error:", err);
                setError("Failed to parse PDF. Please try a different file.");
            } finally {
                setIsParsing(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const handleCategoryChange = (id: string, newCategory: string) => {
        setTransactions(prev => prev.map(t =>
            t.id === id ? { ...t, category: newCategory } : t
        ));
    };

    const handleRemoveTransaction = (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const handleImportConfirm = async () => {
        setIsSaving(true);
        try {
            const formattedTransactions = transactions.map(tx => ({
                bankAccountId,
                date: tx.date,
                description: tx.description,
                amount: tx.amount,
                balance: tx.balance,
                category: tx.category,
                status: 'pending' as const
            }));

            await bulkCreateTransactions(formattedTransactions);

            alert(`Successfully imported ${transactions.length} transactions!`);
            setTransactions([]);
            setView('upload');
            if (onImportSuccess) onImportSuccess();
        } catch (error) {
            console.error("Failed to save transactions:", error);
            alert("Failed to save transactions. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setTransactions([]);
        setView('upload');
        setError(null);
    };

    if (view === 'review') {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Import Summary</h2>
                            <p className="text-sm text-gray-500">Review and categorize transactions before importing.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportConfirm}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Import {transactions.length} Items
                                {isSaving && <div className="ml-2 w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <th className="pb-4 pl-4">Date</th>
                                    <th className="pb-4">Description</th>
                                    <th className="pb-4">Amount</th>
                                    <th className="pb-4">Category</th>
                                    <th className="pb-4 pr-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="group hover:bg-gray-50 transition-colors">
                                        <td className="py-4 pl-4 text-sm font-medium text-gray-600">{tx.date}</td>
                                        <td className="py-4 text-sm font-bold text-gray-900">{tx.description}</td>
                                        <td className={`py-4 text-sm font-bold ${tx.amount < 0 ? 'text-gray-900' : 'text-green-600'}`}>
                                            ${Math.abs(tx.amount).toFixed(2)}
                                        </td>
                                        <td className="py-4">
                                            <Combobox
                                                value={transactions.find(t => t.id === tx.id)?.category || 'Uncategorized'}
                                                onChange={(val) => handleCategoryChange(tx.id, val)}
                                                options={[
                                                    { value: 'Uncategorized', label: 'Uncategorized' },
                                                    ...categories.map(cat => ({ value: cat.name, label: cat.name }))
                                                ]}
                                                className="w-48"
                                            />
                                        </td>
                                        <td className="py-4 pr-4 text-right">
                                            <button
                                                onClick={() => handleRemoveTransaction(tx.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center text-center group hover:border-blue-300 transition-all">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    {isParsing ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    ) : (
                        <Upload className="w-8 h-8" />
                    )}
                </div>
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Import Bank Statement</h2>
                <p className="text-gray-500 font-medium max-w-sm mb-8 leading-relaxed">
                    Upload your bank statement in PDF format. We'll automatically extract transactions and update your records.
                </p>

                {error && (
                    <div className="flex items-center gap-2 text-red-500 bg-red-50 px-4 py-2 rounded-lg mb-6">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-bold">{error}</span>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={isParsing}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsing}
                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isParsing ? 'Processing...' : 'Choose PDF File'}
                </button>
                <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">Supports PDF only • Max 10MB</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-50 pb-4">Recent Imports</h3>
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FileText className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">No recent imports found</p>
                </div>
            </div>
        </div>
    );
};

export default StatementImportsTab;
