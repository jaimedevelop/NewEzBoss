// src/pages/projects/components/projectDashboard/DashboardSummary.tsx

import React from 'react';
import { Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';
import type { ProjectWithId } from '../../../../services/projects';

interface DashboardSummaryProps {
    project: ProjectWithId;
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ project }) => {
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

    const calculateBudgetRemaining = () => {
        return project.currentBudget - project.actualCost;
    };

    const getBudgetRemainingColor = () => {
        const remaining = calculateBudgetRemaining();
        if (remaining < 0) return 'text-red-600';
        if (remaining < project.currentBudget * 0.1) return 'text-yellow-600';
        return 'text-green-600';
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Timeline Card */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 text-blue-600 mb-2">
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm font-medium uppercase tracking-wider">
                        Timeline
                    </span>
                </div>
                <p className="text-sm text-gray-600">
                    {formatDate(project.startDate)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    to {formatDate(project.estimatedEndDate)}
                </p>
                {project.actualEndDate && (
                    <p className="text-xs text-green-600 mt-1 font-medium">
                        Completed: {formatDate(project.actualEndDate)}
                    </p>
                )}
            </div>

            {/* Budget Card */}
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
                <p className="text-xs text-gray-500 mt-1">
                    Spent: {formatCurrency(project.actualCost)}
                </p>
                <p className={`text-xs mt-1 font-medium ${getBudgetRemainingColor()}`}>
                    Remaining: {formatCurrency(calculateBudgetRemaining())}
                </p>
            </div>

            {/* Progress Card */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 text-purple-600 mb-2">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm font-medium uppercase tracking-wider">
                        Progress
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-full transition-all"
                            style={{ width: `${project.completionPercentage}%` }}
                        />
                    </div>
                    <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-right">
                        {project.completionPercentage}%
                    </span>
                </div>
                {project.phases && project.phases.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                        {project.phases.filter(p => p.status === 'completed').length} of{' '}
                        {project.phases.length} phases complete
                    </p>
                )}
            </div>

            {/* Team Card */}
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
                <p className="text-xs text-gray-500 mt-1">Assigned employees</p>
                {project.projectManager && (
                    <p className="text-xs text-gray-600 mt-2">
                        Manager assigned
                    </p>
                )}
            </div>
        </div>
    );
};

export default DashboardSummary;
