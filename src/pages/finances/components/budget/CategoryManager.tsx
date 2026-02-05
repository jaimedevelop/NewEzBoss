import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
    FinanceCategory,
    CategoryType,
    createFinanceCategory,
    updateFinanceCategory,
    deleteFinanceCategory,
    subscribeToFinanceCategories
} from '../../../../services/finances';

const CategoryManager: React.FC = () => {
    const { currentUser } = useAuthContext();
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState<CategoryType>('expense');

    useEffect(() => {
        if (currentUser?.uid) {
            const unsubscribe = subscribeToFinanceCategories(currentUser.uid, (data) => {
                setCategories(data);
            });
            return () => unsubscribe();
        }
    }, [currentUser]);

    const handleAdd = async () => {
        if (!newCategoryName.trim() || !currentUser?.uid) return;

        const result = await createFinanceCategory({
            userId: currentUser.uid,
            name: newCategoryName,
            type: newCategoryType,
            color: newCategoryType === 'income' ? '#10B981' : '#EF4444' // Emerald-500 or Red-500
        });

        if (result.success) {
            setNewCategoryName('');
            setIsAdding(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!newCategoryName.trim()) return;

        const result = await updateFinanceCategory(id, {
            name: newCategoryName,
            type: newCategoryType
        });

        if (result.success) {
            setNewCategoryName('');
            setEditingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            await deleteFinanceCategory(id);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Manage Categories</h3>
                <button
                    onClick={() => {
                        setIsAdding(true);
                        setEditingId(null);
                        setNewCategoryName('');
                        setNewCategoryType('expense');
                    }}
                    className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                >
                    <Plus size={20} />
                </button>
            </div>

            {(isAdding || editingId) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Enter category name..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setNewCategoryType('income')}
                                    className={`py-2 rounded-lg flex items-center justify-center gap-2 border transition-all ${newCategoryType === 'income'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-500'
                                        }`}
                                >
                                    <TrendingUp size={16} />
                                    Income
                                </button>
                                <button
                                    onClick={() => setNewCategoryType('expense')}
                                    className={`py-2 rounded-lg flex items-center justify-center gap-2 border transition-all ${newCategoryType === 'expense'
                                            ? 'bg-red-50 border-red-500 text-red-700'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-red-500'
                                        }`}
                                >
                                    <TrendingDown size={16} />
                                    Expense
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
                                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                            >
                                {editingId ? 'Update' : 'Add Category'}
                            </button>
                            <button
                                onClick={() => {
                                    setIsAdding(false);
                                    setEditingId(null);
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <p>No categories found</p>
                        <p className="text-sm">Add one to get started</p>
                    </div>
                ) : (
                    categories.map((category) => (
                        <div
                            key={category.id}
                            className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                    }`}>
                                    {category.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{category.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{category.type}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => {
                                        setEditingId(category.id!);
                                        setNewCategoryName(category.name);
                                        setNewCategoryType(category.type);
                                        setIsAdding(false);
                                    }}
                                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(category.id!)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CategoryManager;
