
export type PaymentType = 'one-time' | 'recurring';
export type RecurringFrequency = 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Payment {
    version?: number;
    id?: string;
    userId: string;
    title: string;
    type: PaymentType;
    amount: number;
    categoryId: string;
    dueDate: string;
    description?: string;
    isRecurring: boolean;
    recurringDetails?: {
        frequency: RecurringFrequency;
        endDate?: string;
    };
    status: 'pending' | 'paid' | 'overdue';
    createdAt: string;
    updatedAt: string;
}

export interface CalendarEvent {
    version?: number;
    id?: string;
    userId: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    isAllDay: boolean;
    location?: string;
    color?: string;
    createdAt: string;
    updatedAt: string;
}
