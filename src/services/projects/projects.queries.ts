// src/services/projects/projects.queries.ts

import { clientsApiRequest as request } from '../clients/clientsApi';
import type { DatabaseResult } from './projects.types';
import type {
    ProjectWithId,
    ProjectFilters,
    ProjectStats,
    ProjectSummary,
} from './projects.types';

export const getProjectById = async (projectId: string): Promise<DatabaseResult<ProjectWithId>> => {
  try { return {success:true, data: await request<ProjectWithId>(`/projects/${encodeURIComponent(projectId)}`)}; }
  catch(error) { return {success:false,error}; }
};
export const getProjects = async (_userId: string, filters?: ProjectFilters): Promise<DatabaseResult<ProjectWithId[]>> => {
  try {
    let rows = await request<ProjectWithId[]>('/projects');
    if (filters) rows = rows.filter(p => (!filters.status || (Array.isArray(filters.status) ? filters.status.includes(p.status) : p.status === filters.status)) &&
      (!filters.clientId || p.clientId === filters.clientId) && (!filters.projectManager || p.projectManager === filters.projectManager) &&
      (!filters.projectType || p.projectType === filters.projectType) && (!filters.searchTerm || `${p.name} ${p.projectNumber} ${p.clientName}`.toLowerCase().includes(filters.searchTerm.toLowerCase())));
    const key = filters?.sortBy ?? 'createdAt';
    rows.sort((a,b) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * (filters?.sortOrder === 'asc' ? 1 : -1));
    return {success:true,data:rows};
  } catch(error) { return {success:false,error}; }
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
