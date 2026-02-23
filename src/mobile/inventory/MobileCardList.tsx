import React from 'react';
import { Package } from 'lucide-react';

interface MobileCardListProps {
    loading?: boolean;
    error?: string | null;
    isEmpty?: boolean;
    emptyMessage?: string;
    emptySubMessage?: string;
    onRetry?: () => void;
    children: React.ReactNode;
}

// Skeleton card shown during load
const SkeletonCard: React.FC = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="flex gap-3">
            <div className="w-14 h-14 bg-gray-200 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="h-3 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-200 rounded" />
                </div>
            </div>
        </div>
    </div>
);

const MobileCardList: React.FC<MobileCardListProps> = ({
    loading,
    error,
    isEmpty,
    emptyMessage = 'No items found',
    emptySubMessage = 'Try adjusting your filters.',
    onRetry,
    children
}) => {
    if (loading) {
        return (
            <div className="px-4 py-3 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Failed to load</p>
                <p className="text-xs text-gray-500 mb-4">{error}</p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg active:bg-orange-700"
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <Package className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-sm font-medium text-gray-900 mb-1">{emptyMessage}</p>
                <p className="text-xs text-gray-500">{emptySubMessage}</p>
            </div>
        );
    }

    return (
        <div className="px-4 py-3 space-y-3">
            {children}
        </div>
    );
};

export default MobileCardList;