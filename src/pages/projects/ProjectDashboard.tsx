import { EzBossLoader } from '../../mainComponents/ui/EzBossLoader';
// src/pages/projects/ProjectDashboard.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getProjectById, deleteProject, setProjectArchived } from '../../services/projects';
import { ApiError } from '../../services/clients/clientsApi';
import { useAuthContext } from '../../contexts/AuthContext';
import { estimatesApiRequest } from '../../services/estimates/estimatesApi';
import type { ProjectWithId } from '../../services/projects';
import DashboardHeader from './components/projectDashboard/DashboardHeader';
import DashboardSummary from './components/projectDashboard/DashboardSummary';
import ProjectTabs, { projectTab, type TabType } from './components/projectDashboard/ProjectTabs';
import ProjectWorkOrders from './components/projectDashboard/ProjectWorkOrders';
import ProjectPurchases from './components/projectDashboard/ProjectPurchases';
import EditProjectModal from './components/modals/EditProjectModal';
import EstimatesSection from './components/estimates/EstimatesSection';
import ChangeOrdersSection from './components/estimates/ChangeOrdersSection';
import PayAppsSection from './components/estimates/PayAppsSection';

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
    const [creatingDraft, setCreatingDraft] = useState(false);
    const draftRequest = useRef<{ projectId: string; key: string } | null>(null);

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

    const createDraft = async () => {
        if (!project || creatingDraft || project.archivedAt) return;
        if (draftRequest.current?.projectId !== project.id) {
            draftRequest.current = { projectId: project.id, key: crypto.randomUUID() };
        }
        setCreatingDraft(true);
        setError(null);
        try {
            const draft = await estimatesApiRequest<{ id: number }>('/estimates', {
                method: 'POST',
                body: JSON.stringify({ createFromProject: true, projectId: project.id, creationRequestId: draftRequest.current.key }),
            });
            draftRequest.current = null;
            navigate(`/estimates/${draft.id}`);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'The draft could not be confirmed. Retry to check the same request.');
        } finally {
            setCreatingDraft(false);
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
        <div>
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

            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                {/* Summary Cards */}
                <DashboardSummary project={project} />

                {/* Tabs */}
                <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Tab Content */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            Project Overview
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900">
                                    Project Details
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Project Type:</span>
                                        <span className="font-medium">
                                            {project.projectType || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Start Date:</span>
                                        <span className="font-medium">
                                            {formatDate(project.startDate)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Estimated End:
                                        </span>
                                        <span className="font-medium">
                                            {formatDate(project.estimatedEndDate)}
                                        </span>
                                    </div>
                                    {project.actualEndDate && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                Actual End:
                                            </span>
                                            <span className="font-medium">
                                                {formatDate(project.actualEndDate)}
                                            </span>
                                        </div>
                                    )}
                                    {!!project.tags?.length && (
                                        <p className="break-words"><span className="text-gray-600">Tags</span> · {project.tags.join(', ')}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900">
                                    Financial Summary
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Original Budget:
                                        </span>
                                        <span className="font-medium">
                                            {formatCurrency(project.originalBudget)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Current Budget:
                                        </span>
                                        <span className="font-medium">
                                            {formatCurrency(project.currentBudget)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Actual Cost:</span>
                                        <span className="font-medium">
                                            {formatCurrency(project.actualCost)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Profit Margin:</span>
                                        <span className="font-medium text-green-600">
                                            {project.profitMargin.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {project.notes && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-gray-900">Notes</h3>
                                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                                    {project.notes}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'estimates' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            Estimates & Billing
                        </h2>
                        {!project.archivedAt && canPerform('write:estimates') && canPerform('read:estimates') && (
                            <button type="button" onClick={createDraft} disabled={creatingDraft}
                                className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
                                {creatingDraft ? 'Creating draft…' : 'Create estimate draft'}
                            </button>
                        )}

                        {/* Sub-tabs for Estimates Section */}
                        <div className="border-b border-gray-200">
                            <div className="flex gap-4">
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

                {activeTab === 'team' && (
                    <p className="text-gray-500">Team scheduling, GPS and timecards are not connected to projects yet.</p>
                )}

                {!['overview', 'estimates', 'work-orders', 'inventory', 'team'].includes(activeTab) && (
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
