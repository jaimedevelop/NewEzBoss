// src/services/projects/projects.mutations.ts

import { clientsApiRequest as request } from '../clients/clientsApi';
import type { DatabaseResult } from './projects.types';
import type {
    Project,
    ProjectData,
    ProjectPhase,
    ProjectStatus,
} from './projects.types';

export const generateProjectNumber = async (): Promise<string> => (await request<{number:string}>('/projects/next-number')).number;
export const createProject = async (projectData: ProjectData): Promise<DatabaseResult<string>> => {
  try { return {success:true,data:(await request<Project & {id:string}>('/projects',{method:'POST',body:JSON.stringify(projectData)})).id}; }
  catch(error) { return {success:false,error}; }
};
export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<DatabaseResult> => {
  try {
    if (!updates.version) throw new Error('Reload the project before editing.');
    await request(`/projects/${encodeURIComponent(projectId)}`, {method:'PATCH',body:JSON.stringify(updates)});
    return {success:true};
  } catch(error) { return {success:false,error}; }
};
export const deleteProject = async (projectId: string, version?: string): Promise<DatabaseResult> => {
  try {
    if (!version) throw new Error('Reload the project before deleting.');
    await request(`/projects/${encodeURIComponent(projectId)}`, {method:'DELETE',body:JSON.stringify({version})});
    return {success:true};
  } catch(error) { return {success:false,error}; }
};

/**
 * Update project status
 */
export const updateProjectStatus = async (
    projectId: string,
    status: ProjectStatus
): Promise<DatabaseResult> => {
    return updateProject(projectId, { status });
};

/**
 * Update project phases
 */
export const updateProjectPhases = async (
    projectId: string,
    phases: ProjectPhase[]
): Promise<DatabaseResult> => {
    return updateProject(projectId, { phases });
};

/**
 * Update project completion percentage
 */
export const updateProjectCompletion = async (
    projectId: string,
    completionPercentage: number
): Promise<DatabaseResult> => {
    return updateProject(projectId, { completionPercentage });
};

/**
 * Add an estimate to a project
 */
export const addEstimateToProject = async (projectId: string, estimateId: string): Promise<DatabaseResult> => {
  const p = await request<Project>(`/projects/${encodeURIComponent(projectId)}`);
  return updateProject(projectId, {version:p.version, estimateIds:[...new Set([...p.estimateIds, estimateId])]});
};
export const addWorkOrderToProject = async (projectId: string, workOrderId: string): Promise<DatabaseResult> => {
  const p = await request<Project>(`/projects/${encodeURIComponent(projectId)}`);
  return updateProject(projectId, {version:p.version, workOrderIds:[...new Set([...p.workOrderIds, workOrderId])]});
};

/**
 * Update project budget (e.g., after change orders)
 */
export const updateProjectBudget = async (
    projectId: string,
    currentBudget: number
): Promise<DatabaseResult> => {
    return updateProject(projectId, { currentBudget });
};

/**
 * Update project actual cost
 */
export const updateProjectActualCost = async (
    projectId: string,
    actualCost: number
): Promise<DatabaseResult> => {
    return updateProject(projectId, { actualCost });
};
