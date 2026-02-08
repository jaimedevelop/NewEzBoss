import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
    FinanceCategory,
    BudgetGoal,
    subscribeToFinanceCategories,
    subscribeToBudgetGoals
} from '../../../../services/finances';
import PageHeader from '../shared/PageHeader';
import RealityCheckSection from './RealityCheckSection';
import BudgetSelector from './BudgetSelector';
import PricingCalculator from './PricingCalculator';
import CategoryManager from './CategoryManager';

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

    const currentActuals = Object.entries(actuals).reduce((acc, [catId, amount]) => {
        const cat = categories.find(c => c.id === catId);
        if (cat?.type === 'income') {
            acc.totalIncome += amount;
        } else if (cat?.type === 'expense') {
            acc.totalExpenses += amount;
        }
        return acc;
    }, { totalIncome: 0, totalExpenses: 0 });

    // Calculate lifestyle requirement (placeholder - will be calculated from actual expenses)
    const lifestyleRequirement = 6500;
    const businessMustGenerate = 8500; // Includes taxes, buffer, business expenses
    const currentMonthProgress = currentActuals.totalIncome;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <PageHeader
                title="Budget & Pricing"
                description="Manage your lifestyle costs and business pricing strategy."
                breadcrumbs={[
                    { label: 'Financial Health', path: '/finances' },
                    { label: 'Budget & Pricing', path: '/finances/budget' }
                ]}
            />

            <div className="max-w-[1600px] mx-auto p-8 space-y-8">
                {/* Reality Check Section */}
                <RealityCheckSection
                    lifestyleCosts={lifestyleRequirement}
                    businessMustGenerate={businessMustGenerate}
                    currentMonthProgress={currentMonthProgress}
                    currentMonthGoal={businessMustGenerate}
                />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Budget Selector and Pricing Calculator */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Lifestyle Breakdown */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Lifestyle Breakdown</h3>
                            <BudgetSelector
                                categories={categories}
                                goals={goals}
                                actuals={actuals}
                            />
                        </div>

                        {/* Pricing Calculator */}
                        <PricingCalculator
                            lifestyleRequirement={lifestyleRequirement}
                            businessExpenses={2000}
                            taxRate={0.30}
                        />
                    </div>

                    {/* Right Column: Category Manager */}
                    <div className="lg:col-span-1">
                        <CategoryManager />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Budget;
