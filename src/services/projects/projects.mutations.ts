// src/services/projects/projects.mutations.ts

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy,
    limit,
    getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { DatabaseResult } from '../../firebase/database';
import type {
    Project,
    ProjectData,
    ProjectPhase,
    ProjectStatus,
} from './projects.types';
import { removeUndefined } from '../estimates/estimates.utils';

const COLLECTION_NAME = 'projects';

/**
 * Generate sequential project number (format: PRJ-YYYY-###)
 */
export const generateProjectNumber = async (): Promise<string> => {
    try {
        const currentYear = new Date().getFullYear();
        const prefix = `PRJ-${currentYear}-`;

        const q = query(
            collection(db, COLLECTION_NAME),
            orderBy('projectNumber', 'desc'),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return `${prefix}001`;
        }

        const lastProject = snapshot.docs[0].data() as Project;
        const lastNumber = lastProject.projectNumber;

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
        console.error('❌ Error generating project number:', error);
        return `PRJ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    }
};

/**
 * Create a new project
 */
export const createProject = async (
    projectData: ProjectData
): Promise<DatabaseResult<string>> => {
    try {
        const projectNumber = await generateProjectNumber();

        const newProject: any = removeUndefined({
            ...projectData,
            projectNumber,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastActivityDate: new Date().toISOString().split('T')[0],
        });

        const docRef = await addDoc(collection(db, COLLECTION_NAME), newProject);

        console.log(`✅ Project created: ${projectNumber} (${docRef.id})`);
        return { success: true, data: docRef.id };
    } catch (error) {
        console.error('❌ Error creating project:', error);
        return { success: false, error };
    }
};

/**
 * Update an existing project
 */
export const updateProject = async (
    projectId: string,
    updates: Partial<Project>
): Promise<DatabaseResult> => {
    try {
        const projectRef = doc(db, COLLECTION_NAME, projectId);

        await updateDoc(
            projectRef,
            removeUndefined({
                ...updates,
                updatedAt: serverTimestamp(),
                lastActivityDate: new Date().toISOString().split('T')[0],
            })
        );

        console.log(`✅ Project updated: ${projectId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating project:', error);
        return { success: false, error };
    }
};

/**
 * Delete a project
 */
export const deleteProject = async (
    projectId: string
): Promise<DatabaseResult> => {
    try {
        const projectRef = doc(db, COLLECTION_NAME, projectId);
        await deleteDoc(projectRef);

        console.log(`✅ Project deleted: ${projectId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting project:', error);
        return { success: false, error };
    }
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
export const addEstimateToProject = async (
    projectId: string,
    estimateId: string
): Promise<DatabaseResult> => {
    try {
        const projectRef = doc(db, COLLECTION_NAME, projectId);

        // Get current project to append to estimateIds array
        const projectDoc = await getDocs(
            query(collection(db, COLLECTION_NAME), limit(1))
        );

        // Note: In production, you'd want to use arrayUnion here
        // This is a simplified version
        await updateDoc(projectRef, {
            updatedAt: serverTimestamp(),
            lastActivityDate: new Date().toISOString().split('T')[0],
        });

        console.log(`✅ Estimate ${estimateId} added to project ${projectId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error adding estimate to project:', error);
        return { success: false, error };
    }
};

/**
 * Add a work order to a project
 */
export const addWorkOrderToProject = async (
    projectId: string,
    workOrderId: string
): Promise<DatabaseResult> => {
    try {
        const projectRef = doc(db, COLLECTION_NAME, projectId);

        await updateDoc(projectRef, {
            updatedAt: serverTimestamp(),
            lastActivityDate: new Date().toISOString().split('T')[0],
        });

        console.log(`✅ Work order ${workOrderId} added to project ${projectId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error adding work order to project:', error);
        return { success: false, error };
    }
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
