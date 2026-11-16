import { EzBossLoader } from '../../mainComponents/ui/EzBossLoader';
// src/pages/projects/ProjectDashboard.tsx

import { FilePlus2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getProjectById, deleteProject, setProjectArchived } from '../../services/projects';
import { ApiError } from '../../services/clients/clientsApi';
import { useAuthContext } from '../../contexts/AuthContext';
import type { ProjectWithId } from '../../services/projects';
import DashboardHeader from './components/projectDashboard/DashboardHeader';
import DashboardSummary from './components/projectDashboard/DashboardSummary';
import ProjectTabs, { projectTab, type TabType } from './components/projectDashboard/ProjectTabs';
import ProjectWorkOrders from './components/projectDashboard/ProjectWorkOrders';
import ProjectPurchases from './components/projectDashboard/ProjectPurchases';
import ProjectUpdateNotes from './components/projectDashboard/ProjectUpdateNotes';
import { projectNotesPath } from '../../services/projects/projectInspections';
import ProjectInspections from './components/projectDashboard/ProjectInspections';
import EditProjectModal from './components/modals/EditProjectModal';
import EstimatesSection from './components/estimates/EstimatesSection';
import ChangeOrdersSection from './components/estimates/ChangeOrdersSection';
import PayAppsSection from './components/estimates/PayAppsSection';

const statusColors: Record<string, string> = {
    active: 'border-blue-200 bg-blue-50 text-blue-700',
    completed: 'border-green-200 bg-green-50 text-green-700',
    'on-hold': 'border-yellow-200 bg-yellow-50 text-yellow-700',
    planning: 'border-purple-200 bg-purple-50 text-purple-700',
    invoiced: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    cancelled: 'border-red-200 bg-red-50 text-red-700',
};

type EstimatesSubTab = 'all' | 'change-orders' | 'invoices';

const ProjectDashboard: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { canPerform } = useAuthContext();
    const goToList = () => navigate('/projects', { state: { projectList: location.state?.projectList } });
    const [error, setError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);
    const [project, setProject] = useState<ProjectWithId | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useSearchParams();
    const activeTab = projectTab(query.get('tab'));
    const documentTab = query.get('documents');
    const estimatesSubTab = documentTab === 'change-orders' || documentTab === 'invoices' ? documentTab : 'all';
    const setActiveTab = (tab: TabType) => setQuery(tab === 'overview' ? {} : { tab }, { state: location.state });
    const setEstimatesSubTab = (documents: EstimatesSubTab) => setQuery({ tab: 'estimates', documents }, { state: location.state });
    const [showEditModal, setShowEditModal] = useState(false);
    const [actionPending, setActionPending] = useState(false);
    useEffect(() => {
        if (!projectId) return;
        const controller = new AbortController();
        setIsLoading(true);
        setError(null);
        setLoadError(null);
        void getProjectById(projectId, controller.signal).then(response => {
            if (controller.signal.aborted) return;
            if (response.success && response.data) {
                setProject(response.data);
            } else {
                setProject(null);
                const status = response.error instanceof ApiError ? response.error.status : undefined;
                setLoadError(status === 403 ? 'You do not have access to projects in this company.'
                    : status === 404 ? 'Project not found in this company.' : 'The project could not be loaded.');
            }
            setIsLoading(false);
        });
        return () => controller.abort();
    }, [projectId, revision]);

    const handleDelete = async () => {
        if (actionPending || !project?.id) return;

        if (window.confirm(`Are you sure you want to delete project "${project.name}"? This action cannot be undone.`)) {
            setActionPending(true);
            const result = await deleteProject(project.id, project.version);
            setActionPending(false);
            if (result.success) {
                goToList();
            } else {
                setError(result.error instanceof Error ? result.error.message : 'Failed to delete project.');
            }
        }
    };

    const handleArchive = async () => {
        if (actionPending || !project?.version) return;
        setActionPending(true);
        setError(null);
        try {
            await setProjectArchived(project.id, project.version, !project.archivedAt);
            setRevision(value => value + 1);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'The archive action could not be confirmed.');
        } finally {
            setActionPending(false);
        }
    };

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

    if (isLoading || (project && project.id !== projectId)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <EzBossLoader className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
                    <p className="mt-4 text-gray-600">Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 role="alert" className="text-2xl font-bold text-gray-900 mb-2">
                        {loadError ?? 'Project not found.'}
                    </h2>
                    <button className="mr-4 text-orange-700 underline" onClick={() => setRevision(value => value + 1)}>Retry</button>
                    <button
                        onClick={goToList}
                        className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                        Return to projects
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full min-w-0 bg-gray-50">
            {error && (
                <div role="alert" className="p-4 text-red-700">
                    {error}
                    <button className="ml-3 underline" onClick={() => setRevision(value => value + 1)}>Reload project</button>
                </div>
            )}
            {/* Header */}
            <DashboardHeader
                project={project}
                onBack={goToList}
                onArchive={handleArchive}
                actionPending={actionPending}
                onEdit={() => setShowEditModal(true)}
                onDelete={handleDelete}
            />

            <div className="min-w-0 px-3 pb-6 sm:px-6">
                <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4">
                    <dl className="min-w-0 space-y-2">
                        <div className="flex items-center gap-3">
                            <dt className="w-10 shrink-0 text-xs font-medium text-gray-500">Type</dt>
                            <dd className="min-w-0 break-words rounded-lg border border-gray-300 bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                                {project.projectType || 'N/A'}
                            </dd>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <dt className="w-10 shrink-0 text-xs font-medium text-gray-500">Status</dt>
                            <dd className={`rounded-lg border px-3 py-1 text-sm font-medium capitalize ${statusColors[project.status] ?? 'border-gray-300 bg-gray-100 text-gray-800'}`}>
                                {project.status?.replace('-', ' ') || 'N/A'}
                            </dd>
                            {project.archivedAt && <dd className="text-sm font-medium text-gray-600">Archived</dd>}
                        </div>
                    </dl>
                    {!project.archivedAt && canPerform('write:estimates') && canPerform('read:estimates') && (
                        <Link to={`/estimates/new?projectId=${encodeURIComponent(project.id)}`}
                            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 font-medium text-white transition-colors hover:bg-orange-700">
                            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                            Create estimate draft
                        </Link>
                    )}
                </div>

                <div className="mt-6 min-w-0 rounded-lg border border-gray-200 bg-white p-4">
                    {activeTab === 'overview' && (
                        <section className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
                            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {[
                                    ['Start Date', formatDate(project.startDate)],
                                    ['Estimated End', formatDate(project.estimatedEndDate)],
                                    ...(project.actualEndDate ? [['Actual End', formatDate(project.actualEndDate)]] : []),
                                    ...(project.tags?.length ? [['Tags', project.tags.join(', ')]] : []),
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="mb-2 text-sm font-medium text-gray-700">{label}</dt>
                                        <dd className="break-words rounded-md border border-gray-300 px-3 py-2 text-gray-900">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                            {[
                                ['Description', project.description],
                                ['Notes', project.notes],
                            ].map(([label, value]) => value && (
                                <div key={label} className="border-t border-gray-200 pt-4">
                                    <h3 className="mb-2 text-sm font-medium text-gray-700">{label}</h3>
                                    <p className="whitespace-pre-wrap break-words rounded-md border border-gray-300 px-3 py-2 text-gray-900">{value}</p>
                                </div>
                            ))}
                        </section>
                    )}

                    {activeTab === 'estimates' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                Estimates & Billing
                            </h2>
                            {/* Sub-tabs for Estimates Section */}
                            <div className="border-b border-gray-200">
                                <div className="flex flex-wrap gap-x-4">
                                    <button
                                        onClick={() => setEstimatesSubTab('all')}
                                        className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${estimatesSubTab === 'all'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        All Estimates
                                    </button>
                                    <button
                                        onClick={() => setEstimatesSubTab('change-orders')}
                                        className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${estimatesSubTab === 'change-orders'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Change Orders
                                    </button>
                                    <button
                                        onClick={() => setEstimatesSubTab('invoices')}
                                        className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${estimatesSubTab === 'invoices'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Invoices
                                    </button>
                                </div>
                            </div>

                            {/* Sub-tab Content */}
                            {estimatesSubTab === 'all' && <EstimatesSection projectId={projectId!} />}
                            {estimatesSubTab === 'change-orders' && <ChangeOrdersSection projectId={projectId!} />}
                            {estimatesSubTab === 'invoices' && <PayAppsSection projectId={projectId!} />}
                        </div>
                    )}

                    {activeTab === 'work-orders' && <ProjectWorkOrders key={project.id} projectId={project.id} />}
                    {activeTab === 'inventory' && <ProjectPurchases key={project.id} projectId={project.id} />}
                    {activeTab === 'inspections' && (
                        <div className="space-y-6">
                            <ProjectInspections key={project.id} projectId={project.id}
                                canAdd={!project.archivedAt && canPerform('write:projects')} />
                            <ProjectWorkOrders key={project.id + '-inspections'} projectId={project.id} tab="inspections" />
                        </div>
                    )}

                    {activeTab === 'punch-list' && (
                        <section className="space-y-4">
                            <h2 className="text-xl font-bold text-gray-900">Punch-list</h2>
                            <ProjectUpdateNotes key={project.id} path={projectNotesPath(project.id)} punchList
                                canAdd={!project.archivedAt && canPerform('write:projects')} />
                            <ProjectWorkOrders key={project.id + '-punch-list'} projectId={project.id} tab="punch-list" />
                        </section>
                    )}

                    {activeTab === 'team' && (
                        <p className="text-gray-500">Team scheduling, GPS and timecards are not connected to projects yet.</p>
                    )}

                    {!['overview', 'estimates', 'work-orders', 'inventory', 'team', 'inspections', 'punch-list'].includes(activeTab) && (
                        <div className="text-center py-12">
                            <p className="text-gray-500 mb-4">
                                This section is coming soon
                            </p>
                            <p className="text-sm text-gray-400">
                                Detailed {activeTab.replace('-', ' ')} management tools will be available here
                            </p>
                        </div>
                    )}
                </div>
                {activeTab === 'overview' && (
                    <section className="mt-6 space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                        <h2 className="text-lg font-semibold text-gray-900">Project Summary</h2>
                        <DashboardSummary project={project} />
                        <dl className="grid gap-4 border-t border-gray-200 pt-4 sm:grid-cols-2">
                            <div>
                                <dt className="text-sm font-medium text-gray-700">Original Budget</dt>
                                <dd className="mt-1 text-gray-900">{formatCurrency(project.originalBudget)}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-700">Profit Margin</dt>
                                <dd className="mt-1 text-gray-900">{project.profitMargin.toFixed(1)}%</dd>
                            </div>
                        </dl>
                    </section>
                )}
            </div>

            {/* Edit Project Modal */}
            {showEditModal && (
                <EditProjectModal
                    project={project}
                    onClose={() => setShowEditModal(false)}
                    onUpdated={() => {
                        setShowEditModal(false);
                        setRevision(value => value + 1);
                    }}
                />
            )}
        </div>
    );
};

export default ProjectDashboard;
