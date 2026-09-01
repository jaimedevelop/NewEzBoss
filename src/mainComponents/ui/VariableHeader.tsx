import React from 'react';
import { LucideIcon } from 'lucide-react';

export type VariableHeaderColor = 'orange' | 'blue' | 'green' | 'purple';

const COLOR_CLASSES: Record<VariableHeaderColor, { gradient: string; text: string; hoverBg: string }> = {
    orange: { gradient: 'from-orange-500 to-orange-600', text: 'text-orange-600', hoverBg: 'hover:bg-orange-50' },
    blue: { gradient: 'from-blue-500 to-blue-600', text: 'text-blue-600', hoverBg: 'hover:bg-blue-50' },
    green: { gradient: 'from-green-500 to-green-600', text: 'text-green-600', hoverBg: 'hover:bg-green-50' },
    purple: { gradient: 'from-purple-500 to-purple-600', text: 'text-purple-600', hoverBg: 'hover:bg-purple-50' },
};

interface VariableHeaderProps {
    title: string;
    subtitle?: string;
    Icon: LucideIcon;
    onBack?: () => void;
    color?: VariableHeaderColor;
    rightAction?: {
        label: string;
        onClick: () => void;
        Icon?: LucideIcon;
    };
    rightContent?: React.ReactNode;
}

const VariableHeader: React.FC<VariableHeaderProps> = ({
    title,
    subtitle,
    Icon,
    onBack,
    color = 'orange',
    rightAction,
    rightContent
}) => {
    const { gradient, text, hoverBg } = COLOR_CLASSES[color];

    return (
        <div className={`bg-gradient-to-r ${gradient} shadow-sm text-white p-8 -mx-4 -mt-16 sm:-mx-6 lg:-mx-8 lg:-mt-8`}>
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
                        className={`mt-4 sm:mt-0 bg-white ${text} px-6 py-3 rounded-lg ${hoverBg} transition-colors flex items-center space-x-2 font-medium shadow-sm`}
                    >
                        {rightAction.Icon && <rightAction.Icon className="h-5 w-5" />}
                        <span>{rightAction.label}</span>
                    </button>
                )}
                {rightContent && (
                    <div className="mt-4 sm:mt-0">
                        {rightContent}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VariableHeader;
