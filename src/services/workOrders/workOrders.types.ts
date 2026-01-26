// src/services/workOrders/workOrders.types.ts

import { Timestamp } from 'firebase/firestore';

/**
 * Work order status
 */
export type WorkOrderStatus =
    | 'pending'           // Created but not started
    | 'in-progress'      // Work is being performed
    | 'review'           // Completed by worker, pending contractor review
    | 'revisions'        // Revisions requested after contractor review
    | 'completed'        // All reviews done, job closed
    | 'cancelled';       // Job cancelled

/**
 * Checklist item for materials, tools, or equipment
 */
export interface WorkOrderChecklistItem {
    id: string;
    name: string;
    type: 'product' | 'tool' | 'equipment';
    quantity: number;
    isReady: boolean;           // Whether the item is available/ready for the job
    poId?: string;              // Link to the PO this item came from
    notes?: string;
}

/**
 * Task within a work order, typically derived from labor items
 */
export interface WorkOrderTask {
    id: string;
    name: string;
    description: string;
    isCompleted: boolean;
    completedAt?: string;       // ISO date
    completedBy?: string;       // User ID
    media?: WorkOrderMedia[];   // Photos taken specific to this task
}

/**
 * Media attachment for a work order (general or task-specific)
 */
export interface WorkOrderMedia {
    id: string;
    url: string;
    thumbnailUrl?: string;
    fileName: string;
    type: 'image' | 'video' | 'document';
    uploadedAt: string;
    uploadedBy: string;
    taskId?: string;            // If linked to a specific task
}

/**
 * Tracking progress milestones (like Domino's tracker)
 */
export interface WorkOrderMilestone {
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'active' | 'completed';
    completedAt?: string;
}

/**
 * Main Work Order interface
 */
export interface WorkOrder {
    id?: string;
    woNumber: string;                 // Auto-generated (e.g., "WO-2026-001")

    // Links
    estimateId: string;               // Originating estimate
    estimateNumber: string;           // Cached for display
    projectId?: string;
    poIds?: string[];                 // Related purchase orders

    // Basic Info
    customerName: string;
    serviceAddress: string;

    // Status
    status: WorkOrderStatus;

    // Content
    checklist: WorkOrderChecklistItem[];  // Materials, tools, equipment
    tasks: WorkOrderTask[];               // Labor tasks
    media: WorkOrderMedia[];              // General documents and photos
    milestones: WorkOrderMilestone[];     // Progress tracker

    // Tracking
    workerNotes?: string;
    contractorNotes?: string;

    // Reviews/Sign-offs
    workerReviewed: boolean;          // "Worker review (check if all is ok)"
    workerReviewDate?: string;

    contractorReviewed: boolean;      // "Contractor review (check if all is ok)"
    contractorReviewDate?: string;

    revisionCount: number;            // Tracking the "2 revisions" requirement

    // Metadata
    createdBy: string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

/**
 * Data for creating a new work order
 */
export interface WorkOrderData extends Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'woNumber'> {
    // All other fields required
}

/**
 * Response wrapper for work order operations
 */
export interface WorkOrderResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
