import { useAuthContext } from '../../../../contexts/AuthContext';
// src/pages/projects/components/projectDashboard/DashboardHeader.tsx

import React from 'react';
import { Archive, ArchiveRestore, ArrowLeft, ClipboardList, Edit2, Trash2 } from 'lucide-react';
import type { ProjectWithId } from '../../../../services/projects';

interface DashboardHeaderProps {
    project: ProjectWithId;
    onBack: () => void;
    onEdit: () => void;
    onDelete?: () => void;
    onArchive: () => void;
    actionPending: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ project, onBack, onEdit, onDelete, onArchive, actionPending }) => {

    const { canPerform } = useAuthContext();
    const ArchiveIcon = project.archivedAt ? ArchiveRestore : Archive;
    return (
        <header className="border-b border-gray-200 bg-white px-3 py-4 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <button type="button" onClick={onBack} aria-label="Back to Projects" title="Back to Projects"
                        className="mt-1 shrink-0 text-gray-400 transition-colors hover:text-gray-600">
                        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <div className="min-w-0">
                        <div className="mb-2 flex items-start gap-3">
                            <ClipboardList className="mt-0.5 h-6 w-6 shrink-0 text-orange-600" aria-hidden="true" />
                            <h1 className="min-w-0 break-words text-xl font-semibold text-gray-900 sm:text-2xl">
                                {project.name}
                            </h1>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 break-words text-gray-600">
                            <span>{project.projectNumber}</span>
                            {project.clientName && <span aria-hidden="true">•</span>}
                            {project.clientName && <span className="min-w-0">{project.clientName}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {!project.archivedAt && <button
                        disabled={actionPending || !canPerform('write:projects')} onClick={onEdit}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit
                    </button>}
                    {canPerform('write:projects') && (
                        <button type="button" onClick={onArchive} disabled={actionPending}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60">
                            <ArchiveIcon className="h-4 w-4" aria-hidden="true" />
                            {project.archivedAt ? 'Restore' : 'Archive'}
                        </button>
                    )}
                    {onDelete && (
                        <button
                            disabled={actionPending || !canPerform('delete:projects')} onClick={onDelete}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;
