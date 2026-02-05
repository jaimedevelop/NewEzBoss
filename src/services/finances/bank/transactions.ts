import { db } from '../../../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, writeBatch, doc } from 'firebase/firestore';

export interface Transaction {
    id: string;
    bankAccountId: string;
    date: string; // ISO String for simplified sorting/display or keeping original string format
    description: string;
    amount: number;
    category: string;
    balance?: number;
    createdAt?: Date;
    status: 'pending' | 'cleared' | 'reconciled';
}

const COLLECTION_NAME = 'bank_transactions';

export const createTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...transaction,
            createdAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creating transaction:", error);
        throw error;
    }
};

export const getTransactions = async (bankAccountId: string): Promise<Transaction[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('bankAccountId', '==', bankAccountId),
            orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const transactions: Transaction[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            transactions.push({
                id: doc.id,
                ...data,
                // Convert Firestore timestamps if needed, or keep as is if stored as strings
            } as Transaction);
        });

        return transactions;
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return [];
    }
};

export const bulkCreateTransactions = async (transactions: Omit<Transaction, 'id'>[]): Promise<void> => {
    try {
        const batch = writeBatch(db);

        transactions.forEach(tx => {
            const docRef = doc(collection(db, COLLECTION_NAME));
            batch.set(docRef, {
                ...tx,
                createdAt: Timestamp.now()
            });
        });

        await batch.commit();
    } catch (error) {
        console.error("Error bulk creating transactions:", error);
        throw error;
    }
};
