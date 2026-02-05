import { Timestamp } from 'firebase/firestore';

export type PaymentType = 'one-time' | 'recurring';
export type RecurringFrequency = 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Payment {
    id?: string;
    userId: string;
    title: string;
    type: PaymentType;
    amount: number;
    categoryId: string;
    dueDate: Timestamp | string;
    description?: string;
    isRecurring: boolean;
    recurringDetails?: {
        frequency: RecurringFrequency;
        endDate?: Timestamp | string;
    };
    status: 'pending' | 'paid' | 'overdue';
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

export interface CalendarEvent {
    id?: string;
    userId: string;
    title: string;
    description?: string;
    startDate: Timestamp | string;
    endDate: Timestamp | string;
    isAllDay: boolean;
    location?: string;
    color?: string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}
