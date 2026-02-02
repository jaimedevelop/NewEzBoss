// src/pages/projects/components/projectDashboard/ProjectTabs.tsx

import React from 'react';
import {
    ClipboardList,
    FileText,
    Wrench,
    Package,
    Users,
    Image,
    DollarSign,
    MessageSquare,
} from 'lucide-react';

export type TabType =
    | 'overview'
    | 'estimates'
    | 'work-orders'
    | 'inventory'
    | 'team'
    | 'inspections'
    | 'documentation'
    | 'financials'
    | 'communication';

interface ProjectTabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

const ProjectTabs: React.FC<ProjectTabsProps> = ({ activeTab, onTabChange }) => {
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

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 overflow-x-auto">
                <div className="flex">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id as TabType)}
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
        </div>
    );
};

export default ProjectTabs;
