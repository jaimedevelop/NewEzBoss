// src/pages/projects/components/projectDashboard/DashboardHeader.tsx

import React from 'react';
import { ArrowLeft, Settings, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ProjectWithId } from '../../../../services/projects';

interface DashboardHeaderProps {
    project: ProjectWithId;
    onEdit: () => void;
    onDelete?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ project, onEdit, onDelete }) => {
    const navigate = useNavigate();

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

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <button
                onClick={() => navigate('/projects')}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
            </button>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {project.name}
                        </h1>
                        <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                project.status
                            )}`}
                        >
                            {project.status.replace('-', ' ').toUpperCase()}
                        </span>
                    </div>
                    <p className="text-gray-600">{project.projectNumber}</p>
                    <p className="text-gray-600 mt-1">
                        Client: <span className="font-medium">{project.clientName}</span>
                    </p>
                    {project.description && (
                        <p className="text-gray-600 mt-2">{project.description}</p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onEdit}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors gap-2"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit
                    </button>
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="inline-flex items-center justify-center px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 font-medium rounded-lg transition-colors gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    )}
                    <button className="inline-flex items-center justify-center p-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardHeader;
