// src/services/workOrders/workOrders.types.ts


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
    completedAt?: string;       // ISO timestamp
    completedBy?: string;       // Worker assignment ID (first completion wins)
    media?: WorkOrderMedia[];   // Photos taken specific to this task
    laborItemId?: string;       // Parent labor item ID
    laborItemName?: string;     // Parent labor item name (for grouping/title)
    notes?: string;             // Free-text note added by the contractor
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
    mimeType?: string;
    sizeBytes?: number;
    description?: string;
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

export type WorkerInviteStatus = 'not-required' | 'pending' | 'sent' | 'failed' | 'revoked';
export type WorkerInvitationDeliveryStatus = 'not-sent' | 'pending' | 'accepted' | 'failed';
export interface WorkerWorkday {
    localDate: string; timezone?: string; clockInAt?: string; clockOutAt?: string;
    breakStartedAt?: string; breakEndedAt?: string; lunchStartedAt?: string; lunchEndedAt?: string;
    plannedBreakMinutes?: number; plannedLunchMinutes?: number;
    actualBreakMinutes?: number; actualLunchMinutes?: number; grossElapsedMinutes?: number; netWorkedMinutes?: number;
}
export interface WorkerDeliveryResult { assignmentId: string; deliveryStatus: 'accepted' | 'failed' | 'missing-email'; error?: string; action?: string; }

/** An employee (or pending email invite) assigned to this work order. */
export interface WorkOrderWorker {
    id: string;
    employeeId?: string;
    displayName: string;
    occupation?: string;
    email?: string;
    phoneMobile?: string;
    profileFirstName?: string;
    profileLastName?: string;
    profilePhone?: string;
    onboardedAt?: string;
    invitationRevokedAt?: string;
    invitationSentAt?: string;
    invitationDeliveryStatus?: WorkerInvitationDeliveryStatus;
    invitationDeliveryError?: string;
    inviteStatus: WorkerInviteStatus;
    assignedTaskIds: string[];
    gpsLocation?: string;
    clockInAt?: string;
    breakTakenAt?: string;
    breakDurationMinutes: number;
    lunchTakenAt?: string;
    lunchDurationMinutes: number;
    currentWorkday?: WorkerWorkday | null;
    createdAt: string;
    updatedAt: string;
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
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    version: number;
    lastOpenedAt?: string;             // Last opened by the owner account, across devices

    // Estimate change acknowledgement. When the linked estimate changes, the
    // update time is recorded here until a user views the work order in the
    // list or opens its dashboard.
    estimateUpdatedAt?: string;
    estimateUpdateSeenAt?: string;
    hasUnseenEstimateUpdate?: boolean;
}

/**
 * Data for creating a new work order
 */
export interface WorkOrderData extends Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'woNumber' | 'version'> {
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
