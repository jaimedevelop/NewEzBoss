import { useAuthContext } from '../../contexts/AuthContext';
// src/mainComponents/ui/LoadingButton.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  capability?: string;
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  capability,
  loading = false,
  loadingText = 'Loading...',
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const { canPerform } = useAuthContext();
  const actionDenied = capability ? !canPerform(capability) : false;
  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 text-white';
      case 'outline':
        return 'border-2 border-gray-300 hover:border-orange-600 text-gray-700 hover:text-orange-600 bg-white';
      default:
        return 'bg-orange-600 hover:bg-orange-700 text-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-8 py-4 text-lg';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  return (
    <button
      disabled={loading || disabled || actionDenied}
      className={`
        inline-flex items-center justify-center font-medium rounded-md
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
};