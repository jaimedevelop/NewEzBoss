import { financeList, financeWrite } from '../financeApi';
export interface TransactionCategory {
    version?: number;
    id?: string;
    name: string;
    keywords: string[];
    color?: string; // Hex color code for UI badges
}

const DEFAULT_CATEGORIES: Omit<TransactionCategory, 'id'>[] = [
    { name: 'Materials', keywords: ['homedepot', 'lowes', 'supply', 'lumber'], color: '#3b82f6' }, // Blue
    { name: 'Fuel', keywords: ['shell', 'bp', 'exxon', 'speedway', 'wawa'], color: '#f59e0b' }, // Amber
    { name: 'Meals', keywords: ['mcdonalds', 'starbucks', 'dunkin', 'burger', 'pizza', 'restaurant'], color: '#ef4444' }, // Red
    { name: 'Labor', keywords: ['payroll', 'salary', 'wages'], color: '#10b981' }, // Green
    { name: 'Office Supplies', keywords: ['staples', 'office depot', 'amazon'], color: '#8b5cf6' }, // Purple
    { name: 'Utilities', keywords: ['electric', 'water', 'internet', 'comcast', 'verizon'], color: '#6366f1' }, // Indigo
    { name: 'Insurance', keywords: ['state farm', 'geico', 'progressive', 'insurance'], color: '#ec4899' }, // Pink
];


export async function getTransactionCategories():Promise<TransactionCategory[]> {
 const rows=await financeList<TransactionCategory>('bank-transaction-categories');
 if(rows.length)return rows;
 return financeWrite('category-defaults','POST',{categories:DEFAULT_CATEGORIES});
}
export async function saveTransactionCategory(category:TransactionCategory):Promise<string>{return (await financeWrite('bank-transaction-categories',category.id?'PATCH':'POST',category,category.id)).id;}
export const deleteTransactionCategory=async(id:string,version:number|undefined):Promise<void>=>{await financeWrite('bank-transaction-categories','DELETE',{version},id);};
