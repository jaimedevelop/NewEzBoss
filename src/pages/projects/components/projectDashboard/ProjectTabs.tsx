// src/pages/projects/components/projectDashboard/ProjectTabs.tsx

import React from 'react';
import {
    ClipboardList,
    ListChecks,
    FileText,
    Wrench,
    Package,
    Truck,
    Users,
    Image,
    DollarSign,
    MessageSquare,
} from 'lucide-react';

export type TabType =
    | 'overview'
    | 'estimates'
    | 'work-orders'
    | 'punch-list'
    | 'inventory'
    | 'shipments'
    | 'team'
    | 'inspections'
    | 'documentation'
    | 'financials'
    | 'communication';

interface ProjectTabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

const tabs = [
    { id: 'overview', label: 'Overview', icon: ClipboardList },
    { id: 'estimates', label: 'Estimates', icon: FileText },
    { id: 'work-orders', label: 'Work Orders', icon: Wrench },
    { id: 'punch-list', label: 'Punch-list', icon: ListChecks },
    { id: 'inventory', label: 'Inventory & Purchasing', icon: Package },
    { id: 'shipments', label: 'Shipments', icon: Truck },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'inspections', label: 'Inspections', icon: ClipboardList },
    { id: 'documentation', label: 'Documentation', icon: Image },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
] as const;

export function projectTab(value: string | null): TabType {
    return tabs.find(tab => tab.id === value)?.id ?? 'overview';
}

const ProjectTabs: React.FC<ProjectTabsProps> = ({ activeTab, onTabChange }) => {
    return (
        <nav className="flex overflow-x-auto rounded-lg border border-gray-200 bg-white" aria-label="Project sections">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                    <button
                        type="button"
                        key={tab.id}
                        aria-pressed={activeTab === tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-6 sm:py-4 ${activeTab === tab.id
                                ? 'border-orange-600 text-orange-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                    >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {tab.label}
                    </button>
                );
            })}
        </nav>
    );
};

export default ProjectTabs;
