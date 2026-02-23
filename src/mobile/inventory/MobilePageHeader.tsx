import React from 'react';
import { Plus } from 'lucide-react';

interface MobilePageHeaderProps {
    title: string;
    itemCount?: number;
    onAdd?: () => void;
    addLabel?: string;
}

const MobilePageHeader: React.FC<MobilePageHeaderProps> = ({
    title,
    itemCount,
    onAdd,
    addLabel = 'Add'
}) => {
    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <div>
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                {itemCount !== undefined && (
                    <p className="text-xs text-gray-500 mt-0.5">{itemCount} items</p>
                )}
            </div>
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
    );
};

export default MobilePageHeader;