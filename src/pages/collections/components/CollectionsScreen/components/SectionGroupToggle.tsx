// src/pages/collections/components/CollectionsScreen/components/SectionGroupToggle.tsx
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionGroupToggleProps {
    sectionId: string;
    sectionName: string;
    isCollapsed: boolean;
    categoryCount: number;
    onToggle: () => void;
    className?: string;
}

const SectionGroupToggle: React.FC<SectionGroupToggleProps> = ({
    sectionName,
    isCollapsed,
    categoryCount,
    onToggle,
    className = '',
}) => {
    return (
        <button
            onClick={onToggle}
            className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg
        text-sm font-medium transition-all duration-200
        hover:bg-gray-100 border border-gray-300
        ${className}
      `}
            title={isCollapsed
                ? `Expand to show ${categoryCount} individual categories`
                : `Collapse ${categoryCount} categories into section view`
            }
        >
            {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-gray-700">
                {isCollapsed ? `Expand ${sectionName}` : `Collapse to ${sectionName}`}
            </span>
            <span className="text-xs text-gray-500 ml-1">
                ({categoryCount} {categoryCount === 1 ? 'category' : 'categories'})
            </span>
        </button>
    );
};

export default SectionGroupToggle;