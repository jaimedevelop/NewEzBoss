// src/services/workOrders/workOrders.queries.ts

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { WorkOrder, WorkOrderResponse } from './workOrders.types';

const COLLECTION_NAME = 'workOrders';

/**
 * Get a single work order by ID
 */
export const getWorkOrderById = async (
    woId: string
): Promise<WorkOrderResponse<WorkOrder>> => {
    try {
        const woRef = doc(db, COLLECTION_NAME, woId);
        const woSnap = await getDoc(woRef);

        if (woSnap.exists()) {
            return {
                success: true,
                data: { id: woSnap.id, ...woSnap.data() } as WorkOrder
            };
        } else {
            return { success: false, error: 'Work order not found' };
        }
    } catch (error) {
        console.error('❌ Error fetching work order:', error);
        return { success: false, error: error as string };
    }
};

/**
 * Get all work orders for the current user
 */
export const getWorkOrders = async (
    userId: string
): Promise<WorkOrderResponse<WorkOrder[]>> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('createdBy', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const workOrders = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as WorkOrder[];

        return { success: true, data: workOrders };
    } catch (error) {
        console.error('❌ Error fetching work orders:', error);
        return { success: false, error: error as string };
    }
};

/**
 * Get work orders linked to a specific estimate
 */
export const getWorkOrdersByEstimate = async (
    estimateId: string
): Promise<WorkOrderResponse<WorkOrder[]>> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('estimateId', '==', estimateId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const workOrders = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as WorkOrder[];

        return { success: true, data: workOrders };
    } catch (error) {
        console.error('❌ Error fetching work orders by estimate:', error);
        return { success: false, error: error as string };
    }
};
