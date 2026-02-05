import { Timestamp } from 'firebase/firestore';

export type CategoryType = 'income' | 'expense';

export interface FinanceCategory {
    id?: string;
    userId: string;
    name: string;
    type: CategoryType;
    icon?: string;
    color?: string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

export interface BudgetGoal {
    id?: string;
    userId: string;
    categoryId: string;
    amount: number;
    period: 'monthly' | 'yearly';
    year: number;
    month?: number; // 1-12
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

export interface BudgetSummaryData {
    totalIncome: number;
    totalExpenses: number;
    budgetedIncome: number;
    budgetedExpenses: number;
    actualIncome: number;
    actualExpenses: number;
}
