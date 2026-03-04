import React from 'react';
import { ChevronRight } from 'lucide-react';


// A single display field on the card
export interface CardField {
    label: string;
    value: string | number | React.ReactNode;
    // Optional color coding for the value
    valueColor?: 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'orange';
}

export interface MobileItemCardProps {
    id: string;
    title: string;
    imageUrl?: string;
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

const MobileItemCard: React.FC<MobileItemCardProps> = ({
    id,
    title,
    imageUrl,
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
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{title}</p>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
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