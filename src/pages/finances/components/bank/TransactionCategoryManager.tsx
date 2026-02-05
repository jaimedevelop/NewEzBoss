import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag, Save } from 'lucide-react';
import { TransactionCategory, getTransactionCategories, saveTransactionCategory, deleteTransactionCategory } from '../../../../services/finances/bank/transactionCategories';

interface TransactionCategoryManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onCategoriesChange?: () => void; // Callback to refresh parent list
}

const TransactionCategoryManager: React.FC<TransactionCategoryManagerProps> = ({ isOpen, onClose, onCategoriesChange }) => {
    const [categories, setCategories] = useState<TransactionCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState<Partial<TransactionCategory> | null>(null);
    const [newKeyword, setNewKeyword] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    const fetchCategories = async () => {
        setIsLoading(true);
        const data = await getTransactionCategories();
        setCategories(data);
        setIsLoading(false);
    };

    const handleEditStart = (category?: TransactionCategory) => {
        if (category) {
            setEditingCategory({ ...category });
        } else {
            setEditingCategory({ name: '', keywords: [], color: '#3b82f6' });
        }
    };

    const handleSave = async () => {
        if (!editingCategory || !editingCategory.name) return;

        try {
            await saveTransactionCategory(editingCategory as TransactionCategory);
            setEditingCategory(null);
            fetchCategories();
            if (onCategoriesChange) onCategoriesChange();
        } catch (error) {
            console.error("Failed to save", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this category?')) {
            await deleteTransactionCategory(id);
            fetchCategories();
            if (onCategoriesChange) onCategoriesChange();
        }
    };

    const addKeyword = () => {
        if (newKeyword.trim() && editingCategory) {
            const currentKeywords = editingCategory.keywords || [];
            if (!currentKeywords.includes(newKeyword.trim().toLowerCase())) {
                setEditingCategory({
                    ...editingCategory,
                    keywords: [...currentKeywords, newKeyword.trim().toLowerCase()]
                });
            }
            setNewKeyword('');
        }
    };

    const removeKeyword = (keywordToRemove: string) => {
        if (editingCategory) {
            setEditingCategory({
                ...editingCategory,
                keywords: editingCategory.keywords?.filter(k => k !== keywordToRemove)
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-black text-gray-900">Manage Categories</h2>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {editingCategory ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Category Name</label>
                                <input
                                    type="text"
                                    value={editingCategory.name}
                                    onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-100 outline-none font-bold text-gray-900"
                                    placeholder="e.g. Groceries"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Keywords (Auto-match)</label>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newKeyword}
                                        onChange={e => setNewKeyword(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addKeyword()}
                                        className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                                        placeholder="Add keyword (e.g. walmart)"
                                    />
                                    <button
                                        onClick={addKeyword}
                                        className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {editingCategory.keywords?.map(keyword => (
                                        <span key={keyword} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold flex items-center gap-2">
                                            {keyword}
                                            <button onClick={() => removeKeyword(keyword)} className="hover:text-blue-900">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                    {(!editingCategory.keywords || editingCategory.keywords.length === 0) && (
                                        <span className="text-sm text-gray-400 italic">No keywords added yet.</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setEditingCategory(null)}
                                    className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex-1 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Category
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={() => handleEditStart()}
                                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Create New Category
                            </button>

                            {isLoading ? (
                                <div className="text-center py-8 text-gray-400">Loading categories...</div>
                            ) : (
                                <div className="grid gap-3">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="bg-gray-50 p-4 rounded-xl flex items-center justify-between group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: cat.color || '#9ca3af' }}>
                                                    {cat.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{cat.name}</h3>
                                                    <p className="text-xs text-gray-500 font-medium">
                                                        {cat.keywords?.length || 0} keywords: {cat.keywords?.slice(0, 3).join(', ')}{cat.keywords && cat.keywords.length > 3 ? '...' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditStart(cat)}
                                                    className="p-2 bg-white text-gray-600 rounded-lg shadow-sm hover:text-blue-600"
                                                >
                                                    <Tag className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id!)}
                                                    className="p-2 bg-white text-gray-600 rounded-lg shadow-sm hover:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionCategoryManager;
