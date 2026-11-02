
export type AccountType = 'Checking' | 'Savings' | 'Credit Card' | 'Investment';

export interface BankAccount {
    version?: number;
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
    lastUpdated: string;
    createdAt: string;
    updatedAt: string;
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
