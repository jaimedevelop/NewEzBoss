import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { COLLECTIONS, DatabaseResult } from '../../../firebase/database';
import { Payment, CalendarEvent } from './calendar.types';

// Payments
export const createPayment = async (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseResult> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENTS), {
            ...payment,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating payment:', error);
        return { success: false, error };
    }
};

export const updatePayment = async (id: string, payment: Partial<Payment>): Promise<DatabaseResult> => {
    try {
        const docRef = doc(db, COLLECTIONS.PAYMENTS, id);
        await updateDoc(docRef, {
            ...payment,
            updatedAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating payment:', error);
        return { success: false, error };
    }
};

export const deletePayment = async (id: string): Promise<DatabaseResult> => {
    try {
        await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting payment:', error);
        return { success: false, error };
    }
};

export const subscribeToPayments = (userId: string, callback: (payments: Payment[]) => void) => {
    const q = query(
        collection(db, COLLECTIONS.PAYMENTS),
        where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Payment[];
        callback(payments);
    });
};

// Events
export const createCalendarEvent = async (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseResult> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTIONS.CALENDAR_EVENTS), {
            ...event,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating calendar event:', error);
        return { success: false, error };
    }
};

export const updateCalendarEvent = async (id: string, event: Partial<CalendarEvent>): Promise<DatabaseResult> => {
    try {
        const docRef = doc(db, COLLECTIONS.CALENDAR_EVENTS, id);
        await updateDoc(docRef, {
            ...event,
            updatedAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating calendar event:', error);
        return { success: false, error };
    }
};

export const deleteCalendarEvent = async (id: string): Promise<DatabaseResult> => {
    try {
        await deleteDoc(doc(db, COLLECTIONS.CALENDAR_EVENTS, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting calendar event:', error);
        return { success: false, error };
    }
};

export const subscribeToCalendarEvents = (userId: string, callback: (events: CalendarEvent[]) => void) => {
    const q = query(
        collection(db, COLLECTIONS.CALENDAR_EVENTS),
        where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
        const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as CalendarEvent[];
        callback(events);
    });
};
