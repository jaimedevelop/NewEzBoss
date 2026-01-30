// src/services/projects/index.ts

// Types
export * from './projects.types';

// Queries
export {
    getProjectById,
    getProjects,
    getProjectsByClient,
    getActiveProjects,
    getProjectStats,
    getProjectSummaries,
    searchProjects,
} from './projects.queries';

// Mutations
export {
    generateProjectNumber,
    createProject,
    updateProject,
    deleteProject,
    updateProjectStatus,
    updateProjectPhases,
    updateProjectCompletion,
    addEstimateToProject,
    addWorkOrderToProject,
    updateProjectBudget,
    updateProjectActualCost,
} from './projects.mutations';
