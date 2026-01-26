// src/services/workOrders/workOrders.mutations.ts

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    serverTimestamp,
    query,
    orderBy,
    limit,
    getDocs
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { DatabaseResult } from '../../firebase/database';
import type {
    WorkOrder,
    WorkOrderData,
    WorkOrderStatus,
    WorkOrderTask,
    WorkOrderMedia
} from './workOrders.types';
import { removeUndefined } from '../estimates/estimates.utils';

const COLLECTION_NAME = 'workOrders';

/**
 * Generate sequential W.O. number (format: WO-YYYY-###)
 */
export const generateWONumber = async (): Promise<string> => {
    try {
        const currentYear = new Date().getFullYear();
        const prefix = `WO-${currentYear}-`;

        const q = query(
            collection(db, COLLECTION_NAME),
            orderBy('woNumber', 'desc'),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return `${prefix}001`;
        }

        const lastWO = snapshot.docs[0].data() as WorkOrder;
        const lastNumber = lastWO.woNumber;

        if (lastNumber.startsWith(prefix)) {
            const parts = lastNumber.split('-');
            if (parts.length >= 3) {
                const numPart = parseInt(parts[2], 10);
                const nextNum = (numPart + 1).toString().padStart(3, '0');
                return `${prefix}${nextNum}`;
            }
        }

        return `${prefix}001`;
    } catch (error) {
        console.error('❌ Error generating WO number:', error);
        return `WO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    }
};

/**
 * Create a new work order
 */
export const createWorkOrder = async (
    woData: WorkOrderData
): Promise<DatabaseResult<string>> => {
    try {
        const woNumber = await generateWONumber();

        const newWO: any = removeUndefined({
            ...woData,
            woNumber,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        const docRef = await addDoc(collection(db, COLLECTION_NAME), newWO);

        console.log(`✅ Work order created: ${woNumber} (${docRef.id})`);
        return { success: true, data: docRef.id };
    } catch (error) {
        console.error('❌ Error creating work order:', error);
        return { success: false, error };
    }
};

/**
 * Update an existing work order
 */
export const updateWorkOrder = async (
    woId: string,
    updates: Partial<WorkOrder>
): Promise<DatabaseResult> => {
    try {
        const woRef = doc(db, COLLECTION_NAME, woId);

        await updateDoc(woRef, removeUndefined({
            ...updates,
            updatedAt: serverTimestamp(),
        }));

        console.log(`✅ Work order updated: ${woId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating work order:', error);
        return { success: false, error };
    }
};

/**
 * Specifically update a task's status within a work order
 */
export const updateWOTaskStatus = async (
    woId: string,
    tasks: WorkOrderTask[]
): Promise<DatabaseResult> => {
    return updateWorkOrder(woId, { tasks });
};

/**
 * Update media list (add new media)
 */
export const updateWOMedia = async (
    woId: string,
    media: WorkOrderMedia[]
): Promise<DatabaseResult> => {
    return updateWorkOrder(woId, { media });
};

/**
 * Update work order status
 */
export const updateWOStatus = async (
    woId: string,
    status: WorkOrderStatus
): Promise<DatabaseResult> => {
    return updateWorkOrder(woId, { status });
};
