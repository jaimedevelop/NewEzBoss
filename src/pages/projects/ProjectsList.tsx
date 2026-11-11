import { EzBossLoader } from '../../mainComponents/ui/EzBossLoader';
// src/pages/projects/ProjectsList.tsx

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Search,
    Plus,
    FolderKanban,
    File,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { getProjectPage } from '../../services/projects';
import { ApiError } from '../../services/clients/clientsApi';
import CreateProjectModal from './components/modals/CreateProjectModal';
import VariableHeader from '../../mainComponents/ui/VariableHeader';

type ListFilters = { scope: string; search: string; status: string; page: number; archived?: boolean };

const ProjectsList: React.FC = () => {
    const { currentUser, membershipId, canPerform } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const scope = `${currentUser?.uid}:${membershipId}`;
    const savedFilters: ListFilters | undefined = location.state?.projectList;
    const filters = savedFilters?.scope === scope ? savedFilters : { scope, search: '', status: 'all', page: 1 };
    const { search: searchTerm, status: statusFilter, page, archived = false } = filters;
    const [result, setResult] = useState<Awaited<ReturnType<typeof getProjectPage>> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [revision, setRevision] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const projects = result?.items ?? [];

    const changeFilters = (changes: Partial<ListFilters>) => {
        navigate('/projects', { replace: true, state: { projectList: { ...filters, page: 1, ...changes } } });
    };

    useEffect(() => {
        const controller = new AbortController();
        setIsLoading(true);
        setError(null);
        const timer = window.setTimeout(async () => {
            try {
                const data = await getProjectPage(page, searchTerm, statusFilter, controller.signal, archived);
                if (!controller.signal.aborted) setResult(data);
            } catch (error) {
                if (controller.signal.aborted) return;
                setResult(null);
                setError(error instanceof ApiError && error.status === 403
                    ? 'You do not have access to projects in this company.'
                    : 'Projects could not be loaded.');
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        }, 200);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [page, searchTerm, statusFilter, archived, revision]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
        });
    };

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
        <div className="space-y-6">
            {/* Header */}
            <VariableHeader
                title="Projects"
                subtitle="Manage and track all of your construction projects"
                Icon={File}
                rightAction={{
                    label: "New Project",
                    capability: 'write:projects',
                    onClick: () => { if (canPerform('write:projects')) setShowCreateModal(true); },
                    Icon: Plus
                }}
            />

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        aria-label="Search projects"
                        maxLength={500}
                        placeholder="Search by project name, number, or client..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => changeFilters({ search: e.target.value })}
                    />
                </div>
                <select
                    aria-label="Project status"
                    value={statusFilter}
                    onChange={(e) => changeFilters({ status: e.target.value })}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none bg-white"
                >
                    <option value="all">All Status</option>
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={archived} onChange={event => changeFilters({ archived: event.target.checked })} />
                    Archived projects
                </label>
            </div>

            {/* Projects Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <EzBossLoader className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                        <p className="mt-4 text-gray-600">Loading projects...</p>
                    </div>
                ) : error ? (
                    <div className="p-6 text-center">
                        <p role="alert" className="text-red-700">{error}</p>
                        <button className="mt-3 text-orange-700 underline" onClick={() => setRevision(value => value + 1)}>Retry</button>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="p-12 text-center">
                        <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No projects found
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {page > 1 ? 'Return to the previous page' : searchTerm || statusFilter !== 'all' || archived
                                ? 'Try adjusting your filters'
                                : 'Get started by creating your first project'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Project
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Client
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Timeline
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Budget
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Progress
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {projects.map((project) => (
                                    <tr
                                        key={project.id}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div>
                                                <Link className="font-semibold text-orange-700 hover:underline" to={`/projects/${encodeURIComponent(project.id)}`} state={{ projectList: filters }}>
                                                    {project.name}
                                                </Link>
                                                <p className="text-sm text-gray-500">
                                                    {project.projectNumber}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-gray-900">{project.clientName}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                                    project.status
                                                )}`}
                                            >
                                                {project.status.replace('-', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <p className="text-gray-900">
                                                    {formatDate(project.startDate)}
                                                </p>
                                                <p className="text-gray-500">
                                                    to {formatDate(project.estimatedEndDate)}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <p className="text-gray-900 font-semibold">
                                                    {formatCurrency(project.currentBudget)}
                                                </p>
                                                <p className="text-gray-500">
                                                    Spent: {formatCurrency(project.actualCost)}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="bg-gradient-to-r from-orange-500 to-orange-600 h-full transition-all"
                                                        style={{
                                                            width: `${project.completionPercentage}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-right">
                                                    {project.completionPercentage}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {!error && (page > 1 || result?.hasMore) && (
                <nav aria-label="Project pages" className="flex items-center justify-center gap-4">
                    <button className="p-2 text-orange-700 disabled:text-gray-500" disabled={isLoading || page === 1} onClick={() => changeFilters({ page: page - 1 })}>Previous</button>
                    <span aria-live="polite">Page {page}</span>
                    <button className="p-2 text-orange-700 disabled:text-gray-500" disabled={isLoading || !result?.hasMore} onClick={() => changeFilters({ page: page + 1 })}>Next</button>
                </nav>
            )}

            {/* Create Project Modal */}
            {showCreateModal && (
                <CreateProjectModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        changeFilters({ page: 1, archived: false });
                        setRevision(value => value + 1);
                    }}
                />
            )}
        </div>
    );
};

export default ProjectsList;
