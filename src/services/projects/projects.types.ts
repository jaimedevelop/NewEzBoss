// src/services/projects/projects.types.ts

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// PROJECT PHASE
// ============================================================================

/**
 * Project phase status
 */
export type ProjectPhaseStatus = 'not-started' | 'in-progress' | 'completed';

/**
 * Individual phase within a project
 */
export interface ProjectPhase {
    id: string;
    projectId: string;
    name: string;                    // "Foundation", "Rough-In", "Finish"
    phaseNumber: number;             // 1, 2, 3
    estimatedCost: number;
    actualCost: number;
    status: ProjectPhaseStatus;
    startDate?: string;              // YYYY-MM-DD format
    endDate?: string;                // YYYY-MM-DD format
    workOrderIds: string[];
    notes?: string;
}

// ============================================================================
// PROJECT
// ============================================================================

/**
 * Project status
 */
export type ProjectStatus =
    | 'planning'      // Initial planning phase
    | 'active'        // Work in progress
    | 'on-hold'       // Temporarily paused
    | 'completed'     // Work finished
    | 'invoiced'      // Fully invoiced
    | 'cancelled';    // Project cancelled

/**
 * Service address for project location
 */
export interface ServiceAddress {
    address: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
}

/**
 * Main Project interface
 */
export interface Project {
    id?: string;
    name: string;
    projectNumber: string;           // PRJ-2026-001

    // Client/Location
    clientId: string;                // Link to Clients module
    clientName: string;              // Cached for display
    serviceAddress: ServiceAddress;

    // Timeline
    startDate: string;               // YYYY-MM-DD format
    estimatedEndDate: string;        // YYYY-MM-DD format
    actualEndDate?: string;          // YYYY-MM-DD format
    status: ProjectStatus;

    // Financial
    originalBudget: number;
    currentBudget: number;           // With change orders
    actualCost: number;
    profitMargin: number;            // Percentage

    // Organization
    phases: ProjectPhase[];          // Break project into phases
    projectManager?: string;         // Employee ID
    assignedEmployees: string[];     // Employee IDs

    // References
    estimateIds: string[];
    changeOrderIds: string[];
    workOrderIds: string[];
    purchaseOrderIds: string[];

    // Tracking
    completionPercentage: number;    // 0-100
    lastActivityDate?: string;       // YYYY-MM-DD format

    // Metadata
    description?: string;
    projectType?: string;            // Residential, Commercial, etc.
    tags: string[];
    notes?: string;

    // User tracking
    userId: string;
    createdBy?: string;
    createdAt?: Timestamp | string;
    updatedAt?: Timestamp | string;
}

// ============================================================================
// FILTERS & QUERIES
// ============================================================================

/**
 * Filters for querying projects
 */
export interface ProjectFilters {
    status?: ProjectStatus | ProjectStatus[];
    clientId?: string;
    projectManager?: string;
    projectType?: string;
    dateFrom?: string;               // YYYY-MM-DD format
    dateTo?: string;                 // YYYY-MM-DD format
    searchTerm?: string;             // Search project name, number, client
    sortBy?: 'startDate' | 'projectNumber' | 'name' | 'status' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Data for creating a new project (without auto-generated fields)
 */
export interface ProjectData extends Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'projectNumber'> {
    // All other fields required
}

/**
 * Project with guaranteed ID field
 */
export interface ProjectWithId extends Project {
    id: string;
}

/**
 * Standard response wrapper for service functions
 */
export interface ProjectResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Statistics for projects
 */
export interface ProjectStats {
    totalProjects: number;
    activeCount: number;
    completedCount: number;
    onHoldCount: number;
    totalBudget: number;
    totalActualCost: number;
    averageProfitMargin: number;
}

/**
 * Project summary for list views
 */
export interface ProjectSummary {
    id: string;
    name: string;
    projectNumber: string;
    clientName: string;
    status: ProjectStatus;
    startDate: string;
    estimatedEndDate: string;
    currentBudget: number;
    actualCost: number;
    completionPercentage: number;
    lastActivityDate?: string;
}
