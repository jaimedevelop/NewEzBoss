import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  error?: string;
  className?: string;
  allowCustom?: boolean; // New prop for custom input support
}

export const SelectField: React.FC<SelectFieldProps> = ({
  options,
  icon,
  error,
  allowCustom = false,
  className = '',
  value,
  ...props
}) => {
  const baseClasses = `block w-full py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${
    error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
  }`;
  
  const paddingClasses = icon ? 'pl-10 pr-3' : 'px-3';

  if (icon) {
    return (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
        <select
          className={`${baseClasses} ${paddingClasses} ${className}`}
          value={value}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {allowCustom && value && !options.find(opt => opt.value === value) && (
            <option value={value}>
              {value}
            </option>
          )}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <select
      className={`${baseClasses} ${paddingClasses} ${className}`}
      value={value}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {allowCustom && value && !options.find(opt => opt.value === value) && (
        <option value={value}>
          {value}
        </option>
      )}
    </select>
  );
};