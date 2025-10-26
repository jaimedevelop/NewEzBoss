// src/mainComponents/ui/PaginationControls.tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ColorVariant = 'orange' | 'purple' | 'blue' | 'green';

interface PaginationControlsProps {
  currentPage: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  totalDisplayed: number;
  pageSize: number;
  color?: ColorVariant;
}

const colorClasses: Record<ColorVariant, { button: string; text: string }> = {
  orange: {
    button: 'hover:bg-orange-50 border-orange-300',
    text: 'text-orange-700'
  },
  purple: {
    button: 'hover:bg-purple-50 border-purple-300',
    text: 'text-purple-700'
  },
  blue: {
    button: 'hover:bg-blue-50 border-blue-300',
    text: 'text-blue-700'
  },
  green: {
    button: 'hover:bg-green-50 border-green-300',
    text: 'text-green-700'
  }
};

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  hasMore,
  onPageChange,
  totalDisplayed,
  pageSize,
  color = 'orange'
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = (currentPage - 1) * pageSize + totalDisplayed;
  const classes = colorClasses[color];

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span>
        {hasMore && ' of many'}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            p-2 rounded-lg border transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            disabled:hover:bg-white
            ${currentPage === 1 ? 'border-gray-300' : classes.button}
          `}
          title="Previous page"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>

        <div className="flex items-center gap-2">
          <span className={`px-4 py-2 text-sm font-medium ${classes.text}`}>
            Page {currentPage}
          </span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasMore}
          className={`
            p-2 rounded-lg border transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            disabled:hover:bg-white
            ${!hasMore ? 'border-gray-300' : classes.button}
          `}
          title="Next page"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;