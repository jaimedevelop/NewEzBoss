import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    color?: 'blue' | 'orange' | 'purple' | 'regular';
}

export const Select: React.FC<SelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select option...',
    className = '',
    disabled = false,
    color = 'regular'
}) => {
    const colorClasses = {
        regular: {
            input: `${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'} border-gray-200 focus:ring-gray-100 placeholder-gray-400`,
            icon: 'text-gray-400 group-hover:text-gray-600'
        },
        blue: {
            input: 'text-blue-600 bg-blue-50 focus:ring-blue-200 placeholder-blue-300 border-blue-100',
            icon: 'text-blue-400 group-hover:text-blue-600'
        },
        orange: {
            input: 'text-orange-600 bg-orange-50 focus:ring-orange-200 placeholder-orange-300 border-orange-100',
            icon: 'text-orange-400 group-hover:text-orange-600'
        },
        purple: {
            input: 'text-purple-600 bg-purple-50 focus:ring-purple-200 placeholder-purple-300 border-purple-100',
            icon: 'text-purple-400 group-hover:text-purple-600'
        }
    };

    const activeColor = colorClasses[color];

    return (
        <div className={`relative ${className}`}>
            <div className="relative group">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`w-full appearance-none px-4 py-2 text-sm font-medium rounded-lg border focus:ring-2 focus:outline-none transition-all ${activeColor.input} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
                >
                    {placeholder && <option value="" disabled>{placeholder}</option>}
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 ${activeColor.icon}`} />
                </div>
            </div>
        </div>
    );
};
