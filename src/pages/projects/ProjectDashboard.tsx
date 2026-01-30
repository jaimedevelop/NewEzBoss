// src/pages/projects/ProjectDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    DollarSign,
    Users,
    FileText,
    Wrench,
    Package,
    ClipboardList,
    MessageSquare,
    Image,
    TrendingUp,
    Settings,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { getProjectById } from '../../services/projects';
import type { ProjectWithId } from '../../services/projects';

type TabType =
    | 'overview'
    | 'estimates'
    | 'work-orders'
    | 'inventory'
    | 'team'
    | 'inspections'
    | 'documentation'
    | 'financials'
    | 'communication';

const ProjectDashboard: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuthContext();
    const [project, setProject] = useState<ProjectWithId | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

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

    const tabs = [
        { id: 'overview', label: 'Overview', icon: ClipboardList },
        { id: 'estimates', label: 'Estimates', icon: FileText },
        { id: 'work-orders', label: 'Work Orders', icon: Wrench },
        { id: 'inventory', label: 'Inventory & Purchasing', icon: Package },
        { id: 'team', label: 'Team', icon: Users },
        { id: 'inspections', label: 'Inspections', icon: ClipboardList },
        { id: 'documentation', label: 'Documentation', icon: Image },
        { id: 'financials', label: 'Financials', icon: DollarSign },
        { id: 'communication', label: 'Communication', icon: MessageSquare },
    ] as const;

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
                        <div className="flex items-center gap-3 mb-2">
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

                    <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors gap-2">
                        <Settings className="w-5 h-5" />
                        Settings
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 text-blue-600 mb-2">
                        <Calendar className="w-5 h-5" />
                        <span className="text-sm font-medium uppercase tracking-wider">
                            Timeline
                        </span>
                    </div>
                    <p className="text-sm text-gray-600">
                        {formatDate(project.startDate)} - {formatDate(project.estimatedEndDate)}
                    </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 text-green-600 mb-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-sm font-medium uppercase tracking-wider">
                            Budget
                        </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(project.currentBudget)}
                    </p>
                    <p className="text-xs text-gray-500">
                        Spent: {formatCurrency(project.actualCost)}
                    </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 text-purple-600 mb-2">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-sm font-medium uppercase tracking-wider">
                            Progress
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-full transition-all"
                                style={{ width: `${project.completionPercentage}%` }}
                            />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                            {project.completionPercentage}%
                        </span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 text-orange-600 mb-2">
                        <Users className="w-5 h-5" />
                        <span className="text-sm font-medium uppercase tracking-wider">
                            Team
                        </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                        {project.assignedEmployees.length}
                    </p>
                    <p className="text-xs text-gray-500">Assigned employees</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200 overflow-x-auto">
                    <div className="flex">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.id
                                            ? 'border-orange-500 text-orange-600 bg-orange-50'
                                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
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

                    {activeTab !== 'overview' && (
                        <div className="text-center py-12">
                            <p className="text-gray-500 mb-4">
                                {tabs.find((t) => t.id === activeTab)?.label} section coming
                                soon
                            </p>
                            <p className="text-sm text-gray-400">
                                This tab will display detailed information and management tools
                                for {tabs.find((t) => t.id === activeTab)?.label.toLowerCase()}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectDashboard;
