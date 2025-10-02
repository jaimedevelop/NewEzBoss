// src/mainComponents/ui/SavingIndicator.tsx
import React, { useEffect, useState } from 'react';
import { Save, AlertCircle, Loader2, Check } from 'lucide-react';
import type { SaveStatus } from '../../hooks/useAutoSave';

interface SavingIndicatorProps {
  status: SaveStatus;
  error?: string | null;
  onDismissError?: () => void;
}

/**
 * Small non-intrusive indicator showing save status
 * Appears in top-right corner with appropriate icon and color
 */
const SavingIndicator: React.FC<SavingIndicatorProps> = ({
  status,
  error,
  onDismissError,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (status !== 'idle') {
      setShouldRender(true);
      // Small delay for animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Wait for animation to complete before removing from DOM
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Auto-hide success message after 2 seconds
  useEffect(() => {
    if (status === 'saved') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setShouldRender(false), 300);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!shouldRender) return null;

  const getIndicatorConfig = () => {
    switch (status) {
      case 'saving':
        return {
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          icon: Loader2,
          label: 'Saving...',
          animate: true,
        };
      case 'saved':
        return {
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          icon: Check,
          label: 'Saved',
          animate: false,
        };
      case 'error':
        return {
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          icon: AlertCircle,
          label: error || 'Save failed',
          animate: false,
        };
      default:
        return null;
    }
  };

  const config = getIndicatorConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg
          ${config.bgColor} ${config.textColor}
          min-w-[120px]
        `}
      >
        <Icon
          className={`w-4 h-4 ${config.animate ? 'animate-spin' : ''}`}
        />
        <span className="text-sm font-medium whitespace-nowrap">
          {config.label}
        </span>
        
        {status === 'error' && onDismissError && (
          <button
            onClick={onDismissError}
            className="ml-2 hover:opacity-75 transition-opacity"
            aria-label="Dismiss error"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        )}
      </div>

      {/* Optional: Error details tooltip */}
      {status === 'error' && error && error.length > 30 && (
        <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-white text-gray-900 text-xs rounded-lg shadow-xl border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default SavingIndicator;