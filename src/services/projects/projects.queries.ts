// src/services/projects/projects.queries.ts

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { DatabaseResult } from '../../firebase/database';
import type {
    Project,
    ProjectWithId,
    ProjectFilters,
    ProjectStats,
    ProjectSummary,
} from './projects.types';

const COLLECTION_NAME = 'projects';

/**
 * Convert Firestore timestamp to string
 */
const convertTimestamp = (timestamp: any): string => {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toISOString();
    }
    return timestamp;
};

/**
 * Get a single project by ID
 */
export const getProjectById = async (
    projectId: string
): Promise<DatabaseResult<ProjectWithId>> => {
    try {
        const projectRef = doc(db, COLLECTION_NAME, projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
            return { success: false, error: 'Project not found' };
        }

        const projectData = projectSnap.data() as Project;
        const project: ProjectWithId = {
            ...projectData,
            id: projectSnap.id,
            createdAt: convertTimestamp(projectData.createdAt),
            updatedAt: convertTimestamp(projectData.updatedAt),
        };

        return { success: true, data: project };
    } catch (error) {
        console.error('❌ Error fetching project:', error);
        return { success: false, error };
    }
};

/**
 * Get all projects for a user
 */
export const getProjects = async (
    userId: string,
    filters?: ProjectFilters
): Promise<DatabaseResult<ProjectWithId[]>> => {
    try {
        let q = query(
            collection(db, COLLECTION_NAME),
            where('userId', '==', userId)
        );

        // Apply filters
        if (filters?.status) {
            if (Array.isArray(filters.status)) {
                q = query(q, where('status', 'in', filters.status));
            } else {
                q = query(q, where('status', '==', filters.status));
            }
        }

        if (filters?.clientId) {
            q = query(q, where('clientId', '==', filters.clientId));
        }

        if (filters?.projectManager) {
            q = query(q, where('projectManager', '==', filters.projectManager));
        }

        if (filters?.projectType) {
            q = query(q, where('projectType', '==', filters.projectType));
        }

        // Apply sorting
        const sortField = filters?.sortBy || 'createdAt';
        const sortDirection = filters?.sortOrder || 'desc';
        q = query(q, orderBy(sortField, sortDirection));

        const snapshot = await getDocs(q);

        const projects: ProjectWithId[] = snapshot.docs.map((doc) => {
            const data = doc.data() as Project;
            return {
                ...data,
                id: doc.id,
                createdAt: convertTimestamp(data.createdAt),
                updatedAt: convertTimestamp(data.updatedAt),
            };
        });

        // Apply search filter (client-side)
        let filteredProjects = projects;
        if (filters?.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            filteredProjects = projects.filter(
                (p) =>
                    p.name.toLowerCase().includes(searchLower) ||
                    p.projectNumber.toLowerCase().includes(searchLower) ||
                    p.clientName.toLowerCase().includes(searchLower)
            );
        }

        return { success: true, data: filteredProjects };
    } catch (error) {
        console.error('❌ Error fetching projects:', error);
        return { success: false, error };
    }
};

/**
 * Get projects by client ID
 */
export const getProjectsByClient = async (
    userId: string,
    clientId: string
): Promise<DatabaseResult<ProjectWithId[]>> => {
    return getProjects(userId, { clientId });
};

/**
 * Get active projects
 */
export const getActiveProjects = async (
    userId: string
): Promise<DatabaseResult<ProjectWithId[]>> => {
    return getProjects(userId, { status: 'active' });
};

/**
 * Get project statistics
 */
export const getProjectStats = async (
    userId: string
): Promise<DatabaseResult<ProjectStats>> => {
    try {
        const result = await getProjects(userId);

        if (!result.success || !result.data) {
            return { success: false, error: 'Failed to fetch projects' };
        }

        const projects = result.data;

        const stats: ProjectStats = {
            totalProjects: projects.length,
            activeCount: projects.filter((p) => p.status === 'active').length,
            completedCount: projects.filter((p) => p.status === 'completed').length,
            onHoldCount: projects.filter((p) => p.status === 'on-hold').length,
            totalBudget: projects.reduce((sum, p) => sum + p.currentBudget, 0),
            totalActualCost: projects.reduce((sum, p) => sum + p.actualCost, 0),
            averageProfitMargin:
                projects.length > 0
                    ? projects.reduce((sum, p) => sum + p.profitMargin, 0) /
                    projects.length
                    : 0,
        };

        return { success: true, data: stats };
    } catch (error) {
        console.error('❌ Error calculating project stats:', error);
        return { success: false, error };
    }
};

/**
 * Get project summaries for list view
 */
export const getProjectSummaries = async (
    userId: string,
    filters?: ProjectFilters
): Promise<DatabaseResult<ProjectSummary[]>> => {
    try {
        const result = await getProjects(userId, filters);

        if (!result.success || !result.data) {
            return { success: false, error: 'Failed to fetch projects' };
        }

        const summaries: ProjectSummary[] = result.data.map((project) => ({
            id: project.id,
            name: project.name,
            projectNumber: project.projectNumber,
            clientName: project.clientName,
            status: project.status,
            startDate: project.startDate,
            estimatedEndDate: project.estimatedEndDate,
            currentBudget: project.currentBudget,
            actualCost: project.actualCost,
            completionPercentage: project.completionPercentage,
            lastActivityDate: project.lastActivityDate,
        }));

        return { success: true, data: summaries };
    } catch (error) {
        console.error('❌ Error fetching project summaries:', error);
        return { success: false, error };
    }
};

/**
 * Search projects by name or number
 */
export const searchProjects = async (
    userId: string,
    searchTerm: string
): Promise<DatabaseResult<ProjectWithId[]>> => {
    return getProjects(userId, { searchTerm });
};
