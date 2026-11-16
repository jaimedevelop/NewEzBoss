import { clientsApiRequest } from '../clients/clientsApi';

export interface ProjectInspection {
    id: string;
    location: string;
    scheduledDate: string;
    requiredItems: string;
}

const path = (projectId: string) => `/projects/${encodeURIComponent(projectId)}/inspections`;

export function getProjectInspections(projectId: string, signal: AbortSignal) {
    return clientsApiRequest<ProjectInspection[]>(path(projectId), { signal });
}

export function addProjectInspection(projectId: string, inspection: ProjectInspection) {
    return clientsApiRequest<ProjectInspection>(path(projectId), {
        method: 'POST',
        body: JSON.stringify(inspection),
    });
}

export function updateRequiredItems(projectId: string, inspectionId: string, requiredItems: string) {
    return clientsApiRequest<ProjectInspection>(`${path(projectId)}/${encodeURIComponent(inspectionId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ requiredItems }),
    });
}

export interface ProjectUpdateNote {
    id: string;
    text: string;
    createdAt: string;
    completed?: boolean;
}

export function projectNotesPath(projectId: string, inspectionId?: string) {
    return inspectionId
        ? `${path(projectId)}/${encodeURIComponent(inspectionId)}/notes`
        : `/projects/${encodeURIComponent(projectId)}/punch-list/notes`;
}
