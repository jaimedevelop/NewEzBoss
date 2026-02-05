import { Timestamp } from 'firebase/firestore';

export type AccountType = 'Checking' | 'Savings' | 'Credit Card' | 'Investment';

export interface BankAccount {
    id?: string;
    userId: string;
    name: string;
    type: AccountType;
    balance: number;
    initialBalance: number;
    currency: string;
    accountNumber?: string;
    institution?: string;
    isActive: boolean;
    lastUpdated: Timestamp | string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

export interface BankAccountFilters {
    userId: string;
    isActive?: boolean;
}

export interface BankResponse {
    accounts: BankAccount[];
}

export interface DatabaseResult<T = void> {
    success: boolean;
    data?: T;
    error?: string;
}
