import React from 'react';
import { ChevronRight } from 'lucide-react';

// Badge shown in the top-right of the card (e.g. stock status)
export interface CardBadge {
    label: string;
    color: 'green' | 'yellow' | 'red' | 'blue' | 'orange' | 'gray';
}

export interface MobileItemCardProps {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    badge?: CardBadge;
    price?: string | number;
    onView: (id: string) => void;
}

const badgeColorMap: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    gray: 'bg-gray-100 text-gray-700'
};

const MobileItemCard: React.FC<MobileItemCardProps> = ({
    id,
    title,
    subtitle,
    imageUrl,
    badge,
    price,
    onView
}) => {
    return (
        <div
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden active:bg-gray-50"
            onClick={() => onView(id)}
        >
            <div className="flex items-center p-4 gap-4">
                {/* Image */}
                <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-contain"
                            onError={e => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : (
                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    )}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
                            {subtitle && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {badge && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColorMap[badge.color]}`}>
                                    {badge.label}
                                </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                    {price !== undefined && (
                        <p className="mt-1 text-sm font-bold text-gray-900">{price}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileItemCard;