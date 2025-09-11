// src/mainComponents/ui/Alert.tsx
import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message?: string; // Make message optional
  children?: React.ReactNode; // Add children support
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  children,
  onClose,
  className = '',
}) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200',
          icon: <CheckCircle className="w-5 h-5 text-green-400" />,
          text: 'text-green-700',
          title: 'text-green-800',
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          icon: <AlertCircle className="w-5 h-5 text-red-400" />,
          text: 'text-red-700',
          title: 'text-red-800',
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: <AlertCircle className="w-5 h-5 text-yellow-400" />,
          text: 'text-yellow-700',
          title: 'text-yellow-800',
        };
      default:
        return {
          container: 'bg-orange-50 border-orange-200',
          icon: <AlertCircle className="w-5 h-5 text-orange-400" />,
          text: 'text-orange-700',
          title: 'text-orange-800',
        };
    }
  };

  const styles = getStyles();

  // Use children if provided, otherwise use message prop
  const content = children || message;

  return (
    <div className={`border rounded-md p-4 ${styles.container} ${className}`}>
      <div className="flex">
        {styles.icon}
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${styles.title}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${title ? 'mt-1' : ''} ${styles.text}`}>
            {content}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto -mx-1.5 -my-1.5 rounded-md p-1.5 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};