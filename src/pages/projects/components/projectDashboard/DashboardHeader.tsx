import { useAuthContext } from '../../../../contexts/AuthContext';
import React from 'react';
import { Archive, ArchiveRestore, Edit2, FolderOpen, Trash2 } from 'lucide-react';
import { RecordDetailHeader, recordHeaderActionClass, recordHeaderDeleteClass } from '../../../../mainComponents/ui/RecordDetailHeader';
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'on-hold':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'planning':
                return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'invoiced':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'cancelled':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const { canPerform } = useAuthContext();
    const archived = Boolean(project.archivedAt);
    return (
        <RecordDetailHeader
            title={project.name}
            icon={FolderOpen}
            backTitle="Back to projects"
            onBack={onBack}
            actions={(
                <>
                    {!archived && (
                        <button type="button" disabled={actionPending || !canPerform('write:projects')}
                            onClick={onEdit} className={recordHeaderActionClass}>
                            <Edit2 className="w-4 h-4" aria-hidden="true" />
                            Edit
                        </button>
                    )}
                    {canPerform('write:projects') && (
                        <button type="button" onClick={onArchive} disabled={actionPending}
                            className={recordHeaderActionClass}>
                            {archived ? <ArchiveRestore className="w-4 h-4" aria-hidden="true" /> : <Archive className="w-4 h-4" aria-hidden="true" />}
                            {archived ? 'Restore' : 'Archive'}
                        </button>
                    )}
                    {onDelete && (
                        <button type="button" disabled={actionPending || !canPerform('delete:projects')}
                            onClick={onDelete} className={recordHeaderDeleteClass}>
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                            Delete
                        </button>
                    )}
                </>
            )}
        >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 break-words">
                {project.clientName && (
                    <>
                        <p className="min-w-0 text-gray-600">{project.clientName}</p>
                        <span className="text-gray-400" aria-hidden="true">•</span>
                    </>
                )}
                <p className="min-w-0 text-lg font-semibold text-gray-900">{project.projectNumber}</p>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status.replace('-', ' ').toUpperCase()}
                </span>
                {archived && <span className="text-sm font-semibold text-gray-600">Archived</span>}
            </div>
            {project.description && <p className="mt-1 break-words text-sm text-gray-500">{project.description}</p>}
        </RecordDetailHeader>
    );
};

export default DashboardHeader;
