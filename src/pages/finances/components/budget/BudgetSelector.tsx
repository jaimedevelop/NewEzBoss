import React, { useState } from 'react';
import { Target, ChevronRight, ChevronLeft, Sliders } from 'lucide-react';
import { FinanceCategory, BudgetGoal, upsertBudgetGoal } from '../../../../services/finances';
import { useAuthContext } from '../../../../contexts/AuthContext';

interface BudgetSelectorProps {
    categories: FinanceCategory[];
    goals: BudgetGoal[];
    actuals: Record<string, number>;
}

const BudgetSelector: React.FC<BudgetSelectorProps> = ({ categories, goals, actuals }) => {
    const { currentUser } = useAuthContext();
    const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');
    const [localGoals, setLocalGoals] = useState<Record<string, number>>({});

    // Filter categories by type
    const filteredCategories = categories.filter(c => c.type === selectedType);

    const handleSliderChange = (categoryId: string, value: number) => {
        setLocalGoals(prev => ({ ...prev, [categoryId]: value }));
    };

    const handleSave = async (categoryId: string) => {
        if (!currentUser?.uid) return;

        const amount = localGoals[categoryId];
        if (amount === undefined) return;

        const date = new Date();
        await upsertBudgetGoal({
            userId: currentUser.uid,
            categoryId,
            amount,
            period: 'monthly',
            year: date.getFullYear(),
            month: date.getMonth() + 1
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                        <Sliders size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Budget Settings</h3>
                </div>

                <div className="flex p-1 bg-gray-100 rounded-xl">
                    <button
                        onClick={() => setSelectedType('income')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${selectedType === 'income'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Income
                    </button>
                    <button
                        onClick={() => setSelectedType('expense')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${selectedType === 'expense'
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Expenses
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {filteredCategories.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-500">No {selectedType} categories found.</p>
                        <p className="text-xs text-gray-400 mt-1">Add categories to set budgets for them.</p>
                    </div>
                ) : (
                    filteredCategories.map((category) => {
                        const goal = goals.find(g => g.categoryId === category.id);
                        const currentGoalValue = localGoals[category.id!] ?? goal?.amount ?? 0;
                        const actualValue = actuals[category.id!] ?? 0;
                        const diff = currentGoalValue - actualValue;
                        const isOver = selectedType === 'expense' ? actualValue > currentGoalValue : actualValue < currentGoalValue;

                        return (
                            <div key={category.id} className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="font-bold text-gray-900 flex items-center gap-2">
                                            {category.name}
                                            {goal?.amount !== currentGoalValue && localGoals[category.id!] !== undefined && (
                                                <button
                                                    onClick={() => handleSave(category.id!)}
                                                    className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full hover:bg-orange-700 transition-colors"
                                                >
                                                    Save Changes
                                                </button>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-500">Actual: {formatCurrency(actualValue)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-gray-900">{formatCurrency(currentGoalValue)}</p>
                                        <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${isOver ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                            }`}>
                                            {selectedType === 'expense'
                                                ? (diff >= 0 ? `${formatCurrency(diff)} remaining` : `${formatCurrency(Math.abs(diff))} over budget`)
                                                : (diff <= 0 ? `${formatCurrency(Math.abs(diff))} above goal` : `${formatCurrency(diff)} to reach goal`)
                                            }
                                        </p>
                                    </div>
                                </div>

                                <input
                                    type="range"
                                    min="0"
                                    max={Math.max(currentGoalValue * 2, actualValue * 1.5, 5000)}
                                    step="50"
                                    value={currentGoalValue}
                                    onChange={(e) => handleSliderChange(category.id!, parseInt(e.target.value))}
                                    className={`w-full h-2 rounded-full appearance-none cursor-pointer outline-none transition-all ${selectedType === 'income' ? 'accent-emerald-500 bg-emerald-50' : 'accent-red-500 bg-red-50'
                                        }`}
                                />
                            </div>
                        );
                    })
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 text-xs italic">
                    <Target size={14} className="text-orange-500" />
                    Adjust sliders to manage your financial goals for this month.
                </div>
            </div>
        </div>
    );
};

export default BudgetSelector;
