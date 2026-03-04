import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface MobileItemCardProps {
    id: string;
    title: string;
    imageUrl?: string;
    price?: string | number;
    onView: (id: string) => void;
}

const MobileItemCard: React.FC<MobileItemCardProps> = ({
    id,
    title,
    imageUrl,
    price,
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
                    {price !== undefined && (
                        <p className="mt-1.5 text-sm font-bold text-gray-900">{price}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileItemCard;