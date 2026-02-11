import React from 'react';
import { LucideIcon } from 'lucide-react';

interface VariableHeaderProps {
    title: string;
    subtitle?: string;
    Icon: LucideIcon;
    onBack?: () => void;
    rightAction?: {
        label: string;
        onClick: () => void;
        Icon?: LucideIcon;
    };
}

const VariableHeader: React.FC<VariableHeaderProps> = ({
    title,
    subtitle,
    Icon,
    onBack,
    rightAction
}) => {
    return (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-sm text-white p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors group mr-2"
                            title="Back"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5 text-white group-hover:scale-110 transition-transform"
                            >
                                <path d="m12 19-7-7 7-7" />
                                <path d="M19 12H5" />
                            </svg>
                        </button>
                    )}
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                        <Icon className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{title}</h1>
                        {subtitle && (
                            <p className="text-orange-100 text-lg">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                {rightAction && (
                    <button
                        onClick={rightAction.onClick}
                        className="mt-4 sm:mt-0 bg-white text-orange-600 px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors flex items-center space-x-2 font-medium shadow-sm"
                    >
                        {rightAction.Icon && <rightAction.Icon className="h-5 w-5" />}
                        <span>{rightAction.label}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default VariableHeader;
