import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { COLLECTIONS } from '../../../firebase/database';
import { BankAccount, DatabaseResult, BankResponse } from './bank.types';

export const getBankAccounts = async (userId: string): Promise<DatabaseResult<BankResponse>> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.BANK_ACCOUNTS),
            where('userId', '==', userId),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const accounts: BankAccount[] = [];

        querySnapshot.forEach((doc) => {
            accounts.push({ id: doc.id, ...doc.data() } as BankAccount);
        });

        return { success: true, data: { accounts } };
    } catch (error: any) {
        console.error('Error getting bank accounts:', error);
        return { success: false, error: error.message };
    }
};

export const subscribeToBankAccounts = (userId: string, callback: (accounts: BankAccount[]) => void) => {
    const q = query(
        collection(db, COLLECTIONS.BANK_ACCOUNTS),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
        const accounts: BankAccount[] = [];
        querySnapshot.forEach((doc) => {
            accounts.push({ id: doc.id, ...doc.data() } as BankAccount);
        });
        callback(accounts);
    }, (error) => {
        console.error('Error subscribing to bank accounts:', error);
    });
};
