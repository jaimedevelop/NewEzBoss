import React from 'react';
import { ChevronRight } from 'lucide-react';

// A single display field on the card
export interface CardField {
    label: string;
    value: string | number | React.ReactNode;
    // Optional color coding for the value
    valueColor?: 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'orange';
}

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
    fields: CardField[];
    onView: (id: string) => void;
}

const valueColorMap: Record<string, string> = {
    default: 'text-gray-900',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600'
};

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
    fields,
    onView
}) => {
    return (
        <div
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden active:bg-gray-50"
            onClick={() => onView(id)}
        >
            <div className="flex items-start p-4 gap-3">
                {/* Image */}
                <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
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
                        <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

                    {/* Fields grid */}
                    {fields.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                            {fields.map((f, i) => (
                                <div key={i} className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">{f.label}</span>
                                    <span className={`text-xs font-medium ${valueColorMap[f.valueColor || 'default']}`}>
                                        {f.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileItemCard;