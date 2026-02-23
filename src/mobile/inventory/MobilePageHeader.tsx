import React from 'react';
import { Plus, ChevronLeft } from 'lucide-react';

interface MobilePageHeaderProps {
    title: string;
    itemCount?: number;
    onAdd?: () => void;
    addLabel?: string;
    onBack?: () => void;
}

const MobilePageHeader: React.FC<MobilePageHeaderProps> = ({
    title,
    itemCount,
    onAdd,
    addLabel = 'Add',
    onBack,
}) => {
    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            {/* Left: back button or spacer */}
            <div className="w-10 flex-shrink-0">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 active:bg-gray-100"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Center: title */}
            <div className="flex-1 text-center">
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                {itemCount !== undefined && (
                    <p className="text-xs text-gray-500 mt-0.5">{itemCount} items</p>
                )}
            </div>

            {/* Right: add button or spacer */}
            <div className="w-10 flex-shrink-0 flex justify-end">
                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium active:bg-orange-700"
                    >
                        <Plus className="w-4 h-4" />
                        {addLabel}
                    </button>
                )}
            </div>
        </div>
    );
};

export default MobilePageHeader;