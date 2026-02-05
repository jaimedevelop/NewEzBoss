import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
    FinanceCategory,
    BudgetGoal,
    subscribeToFinanceCategories,
    subscribeToBudgetGoals
} from '../../../../services/finances';
import BudgetSummary from './BudgetSummary';
import CategoryManager from './CategoryManager';
import BudgetSelector from './BudgetSelector';

const Budget: React.FC = () => {
    const { currentUser } = useAuthContext();
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [goals, setGoals] = useState<BudgetGoal[]>([]);
    const [actuals, setActuals] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!currentUser?.uid) return;

        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const unsubCategories = subscribeToFinanceCategories(currentUser.uid, setCategories);
        const unsubGoals = subscribeToBudgetGoals(currentUser.uid, year, month, setGoals);

        // Placeholder for actuals 
        // In a real app, we would fetch transaction totals grouped by category
        setActuals({
            'placeholder-income-id': 2500,
            'placeholder-expense-id': 1200
        });

        return () => {
            unsubCategories();
            unsubGoals();
        };
    }, [currentUser]);

    // Calculate totals for summary
    const totals = goals.reduce((acc, goal) => {
        const cat = categories.find(c => c.id === goal.categoryId);
        if (cat?.type === 'income') {
            acc.budgetedIncome += goal.amount;
        } else if (cat?.type === 'expense') {
            acc.budgetedExpenses += goal.amount;
        }
        return acc;
    }, { budgetedIncome: 0, budgetedExpenses: 0 });

    const currentActuals = Object.entries(actuals).reduce((acc, [catId, amount]) => {
        const cat = categories.find(c => c.id === catId);
        if (cat?.type === 'income') {
            acc.totalIncome += amount;
        } else if (cat?.type === 'expense') {
            acc.totalExpenses += amount;
        }
        return acc;
    }, { totalIncome: 0, totalExpenses: 0 });

    return (
        <div className="p-6 bg-gray-50/50 min-h-full">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Column: Summary and Sliders */}
                    <div className="flex-1 space-y-6">
                        <BudgetSummary
                            totalIncome={currentActuals.totalIncome}
                            totalExpenses={currentActuals.totalExpenses}
                            budgetedIncome={totals.budgetedIncome}
                            budgetedExpenses={totals.budgetedExpenses}
                        />
                        <BudgetSelector
                            categories={categories}
                            goals={goals}
                            actuals={actuals}
                        />
                    </div>

                    {/* Right Column: Category Manager */}
                    <div className="w-full md:w-80 h-fit">
                        <CategoryManager />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Budget;
