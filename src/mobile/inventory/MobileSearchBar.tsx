import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface MobileSearchBarProps {
    value: string;
    onChange: (val: string) => void;
    onOpenFilters: () => void;
    activeFilterCount?: number;
    placeholder?: string;
}

const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
    value,
    onChange,
    onOpenFilters,
    activeFilterCount = 0,
    placeholder = 'Search...'
}) => {
    return (
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-200">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
            </div>
            <button
                onClick={onOpenFilters}
                className="relative flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0 active:bg-gray-200"
            >
                <SlidersHorizontal className="w-5 h-5 text-gray-600" />
                {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {activeFilterCount}
                    </span>
                )}
            </button>
        </div>
    );
};

export default MobileSearchBar;