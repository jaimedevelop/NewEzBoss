// src/pages/products/components/PaginationControls.tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  totalDisplayed: number;
  pageSize: number;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  hasMore,
  onPageChange,
  totalDisplayed,
  pageSize
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = (currentPage - 1) * pageSize + totalDisplayed;

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
          className="
            p-2 rounded-lg border border-gray-300
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:bg-gray-50 transition-colors
            disabled:hover:bg-white
          "
          title="Previous page"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>

        <div className="flex items-center gap-2">
          <span className="px-4 py-2 text-sm font-medium text-gray-700">
            Page {currentPage}
          </span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasMore}
          className="
            p-2 rounded-lg border border-gray-300
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:bg-gray-50 transition-colors
            disabled:hover:bg-white
          "
          title="Next page"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;