// src/pages/workOrders/components/MilestonesTab.tsx

import React from 'react';
import { CheckCircle2, Clock, Circle } from 'lucide-react';
import { WorkOrderMilestone } from '../../../services/workOrders/workOrders.types';

interface MilestonesTabProps {
    milestones: WorkOrderMilestone[];
}

const MilestonesTab: React.FC<MilestonesTabProps> = ({ milestones }) => {
    return (
        <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-8">Job Progress Tracker</h3>

            <div className="relative">
                {/* Connection Line */}
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-100 -z-10" />

                <div className="space-y-10">
                    {milestones.map((milestone) => {
                        const isCompleted = milestone.status === 'completed';
                        const isActive = milestone.status === 'active';

                        return (
                            <div key={milestone.id} className="flex gap-6 relative">
                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isCompleted
                                    ? 'bg-green-600 text-white'
                                    : isActive
                                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                                        : 'bg-white border-2 border-gray-200 text-gray-300'
                                    }`}>
                                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : isActive ? <Clock className="w-6 h-6 animate-pulse" /> : <Circle className="w-6 h-6" />}
                                </div>

                                <div className="pt-1">
                                    <h4 className={`text-lg font-bold ${isCompleted ? 'text-green-700' : isActive ? 'text-blue-900' : 'text-gray-400'}`}>
                                        {milestone.name}
                                    </h4>
                                    <p className={`mt-1 ${isCompleted ? 'text-green-600' : isActive ? 'text-blue-700' : 'text-gray-500'}`}>
                                        {milestone.description}
                                    </p>
                                    {isCompleted && milestone.completedAt && (
                                        <span className="text-xs font-medium text-green-500 mt-2 block">
                                            Completed: {new Date(milestone.completedAt).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {milestones.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">No milestones defined for this work order tracker.</p>
                </div>
            )}
        </div>
    );
};

export default MilestonesTab;
