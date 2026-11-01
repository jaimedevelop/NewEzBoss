import { db, auth } from '../../../firebase';
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
function ownerId(): string {
    const id = auth.currentUser?.uid;
    if (!id) throw new Error('Sign in before accessing bank transactions.');
    return id;
}


export const createTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...Object.fromEntries(Object.entries(transaction).filter(([, value]) => value !== undefined)),
            userId: ownerId(),
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
            where('userId', '==', ownerId()),
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
        throw error;
    }
};

export const bulkCreateTransactions = async (transactions: Omit<Transaction, 'id'>[]): Promise<void> => {
    try {
        const userId = ownerId();
        if (transactions.length > 500) throw new Error('Import at most 500 transactions at a time.');
        const batch = writeBatch(db);

        transactions.forEach(tx => {
            const docRef = doc(collection(db, COLLECTION_NAME));
            batch.set(docRef, {
                ...Object.fromEntries(Object.entries(tx).filter(([, value]) => value !== undefined)),
                userId,
                createdAt: Timestamp.now()
            });
        });

        await batch.commit();
    } catch (error) {
        console.error("Error bulk creating transactions:", error);
        throw error;
    }
};
