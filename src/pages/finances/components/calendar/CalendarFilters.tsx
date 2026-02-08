import React from 'react';
import { Eye, EyeOff, Filter } from 'lucide-react';

interface CalendarFiltersProps {
    showPayments: boolean;
    setShowPayments: (show: boolean) => void;
}

const CalendarFilters: React.FC<CalendarFiltersProps> = ({
    showPayments,
    setShowPayments
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-400 border-r border-gray-100 pr-4 mr-2">
                <Filter size={18} />
                <span className="text-sm font-bold uppercase tracking-wider">Filters</span>
            </div>

            <button
                onClick={() => setShowPayments(!showPayments)}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${showPayments
                    ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-200'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
            >
                {showPayments ? <Eye size={18} /> : <EyeOff size={18} />}
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${showPayments ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm font-bold">Payments</span>
                </div>
            </button>
        </div>
    );
};

export default CalendarFilters;
