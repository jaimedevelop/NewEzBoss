// src/pages/collections/components/CollectionsScreen/components/GroupingControlPanel.tsx
import React from 'react';
import { Settings, ChevronDown, ChevronRight, X } from 'lucide-react';
import type { CollectionContentType } from '../../../../../services/collections';

interface SectionGroupState {
    sectionId: string;
    sectionName: string;
    isCollapsed: boolean;
    categoryTabIds: string[];
    categoryCount: number;
}

interface GroupingControlPanelProps {
    contentType: CollectionContentType;
    availableSections: SectionGroupState[];
    groupingState: Record<string, boolean>;
    onToggleSection: (sectionId: string) => void;
    onCollapseAll: () => void;
    onExpandAll: () => void;
    onClose: () => void;
}

const GroupingControlPanel: React.FC<GroupingControlPanelProps> = ({
    contentType,
    availableSections,
    groupingState,
    onToggleSection,
    onCollapseAll,
    onExpandAll,
    onClose,
}) => {
    const contentTypeLabel = contentType.charAt(0).toUpperCase() + contentType.slice(1);
    const hasGroupableSections = availableSections.length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            {contentTypeLabel} Grouping
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Close"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                    {!hasGroupableSections ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-2">
                                No sections available for grouping.
                            </p>
                            <p className="text-sm text-gray-400">
                                Sections need at least 2 categories to be grouped.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Description */}
                            <p className="text-sm text-gray-600 mb-4">
                                Group multiple category tabs from the same section into a single section tab for easier navigation.
                            </p>

                            {/* Bulk Actions */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={onCollapseAll}
                                    className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                    Collapse All
                                </button>
                                <button
                                    onClick={onExpandAll}
                                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Expand All
                                </button>
                            </div>

                            {/* Section List */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {availableSections.map((section) => {
                                    const isCollapsed = groupingState[section.sectionId] || false;

                                    return (
                                        <div
                                            key={section.sectionId}
                                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                    {section.sectionName}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {section.categoryCount} {section.categoryCount === 1 ? 'category' : 'categories'}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => onToggleSection(section.sectionId)}
                                                className={`
                          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                          ${isCollapsed
                                                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }
                        `}
                                            >
                                                {isCollapsed ? (
                                                    <>
                                                        <ChevronRight className="w-4 h-4" />
                                                        <span>Collapsed</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="w-4 h-4" />
                                                        <span>Expanded</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupingControlPanel;