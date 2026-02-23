import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface MobileFilterSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onClear: () => void;
    activeFilterCount?: number;
    children: React.ReactNode;
}

const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
    isOpen,
    onClose,
    onClear,
    activeFilterCount = 0,
    children
}) => {
    // Prevent body scroll when sheet is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${isOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'
                    }`}
                style={{ maxHeight: '85vh' }}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">
                        Filters {activeFilterCount > 0 && (
                            <span className="ml-1 text-sm font-normal text-orange-600">
                                ({activeFilterCount} active)
                            </span>
                        )}
                    </h2>
                    <div className="flex items-center gap-3">
                        {activeFilterCount > 0 && (
                            <button
                                onClick={onClear}
                                className="text-sm text-orange-600 font-medium"
                            >
                                Clear all
                            </button>
                        )}
                        <button onClick={onClose} className="p-1">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Filter content - scrollable */}
                <div className="overflow-y-auto px-4 py-4 space-y-4" style={{ maxHeight: 'calc(85vh - 100px)' }}>
                    {children}
                </div>
            </div>
        </>
    );
};

export default MobileFilterSheet;