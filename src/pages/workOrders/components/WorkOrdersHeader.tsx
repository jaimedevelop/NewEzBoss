import React from 'react';
import { ClipboardList, Plus } from 'lucide-react';

interface WorkOrdersHeaderProps {
    onCreate: () => void;
}

const WorkOrdersHeader: React.FC<WorkOrdersHeaderProps> = ({ onCreate }) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <ClipboardList className="w-8 h-8 text-orange-600" />
                    Work Orders
                </h1>
                <p className="text-gray-500 mt-1">Manage and track your active jobs</p>
            </div>

            <button
                onClick={onCreate}
                className="inline-flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors shadow-sm gap-2"
            >
                <Plus className="w-5 h-5" />
                New Work Order
            </button>
        </div>
    );
};

export default WorkOrdersHeader;
