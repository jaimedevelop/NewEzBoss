import { db } from '../../../firebase'; // Assuming centralized firebase export
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export interface TransactionCategory {
    id?: string;
    name: string;
    keywords: string[];
    color?: string; // Hex color code for UI badges
}

const COLLECTION_NAME = 'transaction_categories';

const DEFAULT_CATEGORIES: Omit<TransactionCategory, 'id'>[] = [
    { name: 'Materials', keywords: ['homedepot', 'lowes', 'supply', 'lumber'], color: '#3b82f6' }, // Blue
    { name: 'Fuel', keywords: ['shell', 'bp', 'exxon', 'speedway', 'wawa'], color: '#f59e0b' }, // Amber
    { name: 'Meals', keywords: ['mcdonalds', 'starbucks', 'dunkin', 'burger', 'pizza', 'restaurant'], color: '#ef4444' }, // Red
    { name: 'Labor', keywords: ['payroll', 'salary', 'wages'], color: '#10b981' }, // Green
    { name: 'Office Supplies', keywords: ['staples', 'office depot', 'amazon'], color: '#8b5cf6' }, // Purple
    { name: 'Utilities', keywords: ['electric', 'water', 'internet', 'comcast', 'verizon'], color: '#6366f1' }, // Indigo
    { name: 'Insurance', keywords: ['state farm', 'geico', 'progressive', 'insurance'], color: '#ec4899' }, // Pink
];

export const getTransactionCategories = async (): Promise<TransactionCategory[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        const categories: TransactionCategory[] = [];
        querySnapshot.forEach((doc) => {
            categories.push({ id: doc.id, ...doc.data() } as TransactionCategory);
        });

        // Seed defaults if empty
        if (categories.length === 0) {
            console.log("No categories found, seeding defaults...");
            const seededCategories = await seedDefaultCategories();
            return seededCategories;
        }

        return categories;
    } catch (error) {
        console.error("Error fetching categories:", error);
        // Fallback to defaults in memory if DB fails, to prevent app crash
        return DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: `temp-${i}` }));
    }
};

const seedDefaultCategories = async (): Promise<TransactionCategory[]> => {
    const promises = DEFAULT_CATEGORIES.map(async (cat) => {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), cat);
        return { ...cat, id: docRef.id };
    });
    return Promise.all(promises);
};

export const saveTransactionCategory = async (category: TransactionCategory): Promise<string> => {
    try {
        if (category.id) {
            const docRef = doc(db, COLLECTION_NAME, category.id);
            const { id, ...data } = category;
            await updateDoc(docRef, data);
            return category.id;
        } else {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), category);
            return docRef.id;
        }
    } catch (error) {
        console.error("Error saving category:", error);
        throw error;
    }
};

export const deleteTransactionCategory = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Error deleting category:", error);
        throw error;
    }
};
