// src/pages/products/components/PageSizeSelector.tsx
import React from 'react';

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

const PageSizeSelector: React.FC<PageSizeSelectorProps> = ({
  pageSize,
  onPageSizeChange
}) => {
  const sizes = [20, 50, 100];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Show:</span>
      <div className="flex gap-1">
        {sizes.map(size => (
          <button
            key={size}
            onClick={() => onPageSizeChange(size)}
            className={`
              px-3 py-1 text-sm font-medium rounded transition-colors
              ${pageSize === size
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PageSizeSelector;