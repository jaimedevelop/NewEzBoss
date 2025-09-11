// src/mainComponents/forms/InputField.tsx
import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  icon,
  error,
  className = '',
  ...props
}) => {
  const baseClasses = `block w-full py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${
    error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
  }`;
  
  const paddingClasses = icon ? 'pl-10 pr-3' : 'px-3';

  if (icon) {
    return (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
        <input
          className={`${baseClasses} ${paddingClasses} ${className}`}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      className={`${baseClasses} ${paddingClasses} ${className}`}
      {...props}
    />
  );
};