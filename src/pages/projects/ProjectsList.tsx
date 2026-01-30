// src/pages/projects/ProjectsList.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Filter,
    Plus,
    FolderKanban,
    Clock,
    CheckCircle2,
    PauseCircle,
    DollarSign,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { getProjects, getProjectStats } from '../../services/projects';
import type { ProjectWithId, ProjectStats } from '../../services/projects';

const ProjectsList: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuthContext();
    const [projects, setProjects] = useState<ProjectWithId[]>([]);
    const [stats, setStats] = useState<ProjectStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        if (currentUser?.uid) {
            loadProjects();
            loadStats();
        }
    }, [currentUser?.uid]);

    const loadProjects = async () => {
        setIsLoading(true);
        try {
            const response = await getProjects(currentUser!.uid);
            if (response.success && response.data) {
                setProjects(response.data);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await getProjectStats(currentUser!.uid);
            if (response.success && response.data) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error loading project stats:', error);
        }
    };

    const filteredProjects = projects.filter((project) => {
        const matchesSearch =
            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.clientName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === 'all' || project.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
                    <p className="text-gray-600 mt-1">
                        Manage and track all your construction projects
                    </p>
                </div>
                <button
                    onClick={() => {
                        // TODO: Open create project modal
                        console.log('Create project clicked');
                    }}
                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 gap-2"
                >
                    <Plus className="w-5 h-5" />
                    New Project
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 text-blue-600 mb-2">
                            <Clock className="w-5 h-5" />
                            <span className="text-sm font-medium uppercase tracking-wider">
                                Active
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {stats.activeCount}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 text-green-600 mb-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium uppercase tracking-wider">
                                Completed
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {stats.completedCount}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 text-purple-600 mb-2">
                            <DollarSign className="w-5 h-5" />
                            <span className="text-sm font-medium uppercase tracking-wider">
                                Total Budget
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(stats.totalBudget)}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 text-orange-600 mb-2">
                            <FolderKanban className="w-5 h-5" />
                            <span className="text-sm font-medium uppercase tracking-wider">
                                Total Projects
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {stats.totalProjects}
                        </p>
                    </div>
                </div>
            )}

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by project name, number, or client..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
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
            </div>

            {/* Projects Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        <p className="mt-4 text-gray-600">Loading projects...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="p-12 text-center">
                        <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No projects found
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {searchTerm || statusFilter !== 'all'
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
                                {filteredProjects.map((project) => (
                                    <tr
                                        key={project.id}
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {project.name}
                                                </p>
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
        </div>
    );
};

export default ProjectsList;
