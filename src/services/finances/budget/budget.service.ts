import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { COLLECTIONS, DatabaseResult } from '../../../firebase/database';
import { FinanceCategory, BudgetGoal } from './budget.types';

// Categories
export const createFinanceCategory = async (category: Omit<FinanceCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseResult> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTIONS.FINANCE_CATEGORIES), {
            ...category,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating finance category:', error);
        return { success: false, error };
    }
};

export const updateFinanceCategory = async (id: string, category: Partial<FinanceCategory>): Promise<DatabaseResult> => {
    try {
        const docRef = doc(db, COLLECTIONS.FINANCE_CATEGORIES, id);
        await updateDoc(docRef, {
            ...category,
            updatedAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating finance category:', error);
        return { success: false, error };
    }
};

export const deleteFinanceCategory = async (id: string): Promise<DatabaseResult> => {
    try {
        await deleteDoc(doc(db, COLLECTIONS.FINANCE_CATEGORIES, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting finance category:', error);
        return { success: false, error };
    }
};

export const subscribeToFinanceCategories = (userId: string, callback: (categories: FinanceCategory[]) => void) => {
    const q = query(
        collection(db, COLLECTIONS.FINANCE_CATEGORIES),
        where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
        const categories = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as FinanceCategory[];
        callback(categories);
    });
};

// Budget Goals
export const upsertBudgetGoal = async (goal: Omit<BudgetGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseResult> => {
    try {
        // Find existing goal for this category, month, and year
        const q = query(
            collection(db, COLLECTIONS.BUDGET_GOALS),
            where('userId', '==', goal.userId),
            where('categoryId', '==', goal.categoryId),
            where('year', '==', goal.year),
            where('month', '==', goal.month)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            const docRef = doc(db, COLLECTIONS.BUDGET_GOALS, docId);
            await updateDoc(docRef, {
                amount: goal.amount,
                updatedAt: serverTimestamp(),
            });
            return { success: true, id: docId };
        } else {
            const docRef = await addDoc(collection(db, COLLECTIONS.BUDGET_GOALS), {
                ...goal,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return { success: true, id: docRef.id };
        }
    } catch (error) {
        console.error('Error upserting budget goal:', error);
        return { success: false, error };
    }
};

export const subscribeToBudgetGoals = (userId: string, year: number, month: number, callback: (goals: BudgetGoal[]) => void) => {
    const q = query(
        collection(db, COLLECTIONS.BUDGET_GOALS),
        where('userId', '==', userId),
        where('year', '==', year),
        where('month', '==', month)
    );
    return onSnapshot(q, (snapshot) => {
        const goals = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as BudgetGoal[];
        callback(goals);
    });
};
