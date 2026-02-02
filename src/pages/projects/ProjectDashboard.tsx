// src/pages/projects/ProjectDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { getProjectById, deleteProject } from '../../services/projects';
import type { ProjectWithId } from '../../services/projects';
import DashboardHeader from './components/projectDashboard/DashboardHeader';
import DashboardSummary from './components/projectDashboard/DashboardSummary';
import ProjectTabs, { type TabType } from './components/projectDashboard/ProjectTabs';
import EditProjectModal from './components/modals/EditProjectModal';
import EstimatesSection from './components/estimates/EstimatesSection';
import ChangeOrdersSection from './components/estimates/ChangeOrdersSection';
import PayAppsSection from './components/estimates/PayAppsSection';
import EmployeeAssignments from './components/team/EmployeeAssignments';
import TimecardSection from './components/team/TimecardSection';
import GPSTracking from './components/team/GPSTracking';
import CrewSchedule from './components/team/CrewSchedule';

type EstimatesSubTab = 'all' | 'change-orders' | 'pay-apps';
type TeamSubTab = 'assignments' | 'timecards' | 'gps' | 'schedule';

const ProjectDashboard: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuthContext();
    const [project, setProject] = useState<ProjectWithId | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [estimatesSubTab, setEstimatesSubTab] = useState<EstimatesSubTab>('all');
    const [teamSubTab, setTeamSubTab] = useState<TeamSubTab>('assignments');
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        if (currentUser?.uid && projectId) {
            loadProject();
        }
    }, [currentUser?.uid, projectId]);

    const loadProject = async () => {
        setIsLoading(true);
        try {
            const response = await getProjectById(projectId!);
            if (response.success && response.data) {
                setProject(response.data);
            } else {
                console.error('Project not found');
                navigate('/projects');
            }
        } catch (error) {
            console.error('Error loading project:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!project?.id) return;

        if (window.confirm(`Are you sure you want to delete project "${project.name}"? This action cannot be undone.`)) {
            const result = await deleteProject(project.id);
            if (result.success) {
                navigate('/projects');
            } else {
                console.error('Failed to delete project:', result.error);
            }
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
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                    <p className="mt-4 text-gray-600">Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Project not found
                    </h2>
                    <button
                        onClick={() => navigate('/projects')}
                        className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                        Return to projects
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <DashboardHeader
                project={project}
                onEdit={() => setShowEditModal(true)}
                onDelete={handleDelete}
            />

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
                                    onClick={() => setEstimatesSubTab('pay-apps')}
                                    className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${estimatesSubTab === 'pay-apps'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    Pay Apps
                                </button>
                            </div>
                        </div>

                        {/* Sub-tab Content */}
                        {estimatesSubTab === 'all' && <EstimatesSection projectId={projectId!} />}
                        {estimatesSubTab === 'change-orders' && <ChangeOrdersSection projectId={projectId!} />}
                        {estimatesSubTab === 'pay-apps' && <PayAppsSection projectId={projectId!} />}
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            Team Management
                        </h2>

                        {/* Sub-tabs for Team Section */}
                        <div className="border-b border-gray-200">
                            <div className="flex gap-4 overflow-x-auto pb-px">
                                <button
                                    onClick={() => setTeamSubTab('assignments')}
                                    className={`pb-3 px-1 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${teamSubTab === 'assignments'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    Assignments
                                </button>
                                <button
                                    onClick={() => setTeamSubTab('timecards')}
                                    className={`pb-3 px-1 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${teamSubTab === 'timecards'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    Timecards
                                </button>
                                <button
                                    onClick={() => setTeamSubTab('gps')}
                                    className={`pb-3 px-1 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${teamSubTab === 'gps'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    GPS Tracking
                                </button>
                                <button
                                    onClick={() => setTeamSubTab('schedule')}
                                    className={`pb-3 px-1 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${teamSubTab === 'schedule'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    Crew Schedule
                                </button>
                            </div>
                        </div>

                        {/* Sub-tab Content */}
                        {teamSubTab === 'assignments' && <EmployeeAssignments projectId={projectId!} />}
                        {teamSubTab === 'timecards' && <TimecardSection projectId={projectId!} />}
                        {teamSubTab === 'gps' && <GPSTracking projectId={projectId!} />}
                        {teamSubTab === 'schedule' && <CrewSchedule projectId={projectId!} />}
                    </div>
                )}

                {activeTab !== 'overview' && activeTab !== 'estimates' && activeTab !== 'team' && (
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

            {/* Edit Project Modal */}
            {showEditModal && (
                <EditProjectModal
                    project={project}
                    onClose={() => setShowEditModal(false)}
                    onUpdated={() => {
                        setShowEditModal(false);
                        loadProject();
                    }}
                />
            )}
        </div>
    );
};

export default ProjectDashboard;
