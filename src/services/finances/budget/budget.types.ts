
export type CategoryType = 'income' | 'expense';

export interface FinanceCategory {
    version?: number;
    id?: string;
    userId: string;
    name: string;
    type: CategoryType;
    icon?: string;
    color?: string;
    createdAt: string;
    updatedAt: string;
}

export interface BudgetGoal {
    version: number;
    id?: string;
    userId: string;
    categoryId: string;
    amount: number;
    period: 'monthly' | 'yearly';
    year: number;
    month?: number; // 1-12
    createdAt: string;
    updatedAt: string;
}

export interface BudgetSummaryData {
    totalIncome: number;
    totalExpenses: number;
    budgetedIncome: number;
    budgetedExpenses: number;
    actualIncome: number;
    actualExpenses: number;
}
