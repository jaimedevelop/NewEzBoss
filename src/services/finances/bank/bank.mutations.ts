import {
    collection,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    deleteDoc
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { COLLECTIONS } from '../../../firebase/database';
import { BankAccount, DatabaseResult } from './bank.types';

export const createBankAccount = async (accountData: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt' | 'lastUpdated' | 'isActive'>): Promise<DatabaseResult<string>> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTIONS.BANK_ACCOUNTS), {
            ...accountData,
            isActive: true,
            lastUpdated: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return { success: true, data: docRef.id };
    } catch (error: any) {
        console.error('Error creating bank account:', error);
        return { success: false, error: error.message };
    }
};

export const updateBankAccount = async (id: string, accountData: Partial<BankAccount>): Promise<DatabaseResult> => {
    try {
        const docRef = doc(db, COLLECTIONS.BANK_ACCOUNTS, id);
        await updateDoc(docRef, {
            ...accountData,
            updatedAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating bank account:', error);
        return { success: false, error: error.message };
    }
};

export const deleteBankAccount = async (id: string): Promise<DatabaseResult> => {
    try {
        const docRef = doc(db, COLLECTIONS.BANK_ACCOUNTS, id);
        await deleteDoc(docRef);
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting bank account:', error);
        return { success: false, error: error.message };
    }
};
