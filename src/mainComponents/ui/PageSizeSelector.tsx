// src/mainComponents/ui/PageSizeSelector.tsx
import React from 'react';

type ColorVariant = 'orange' | 'purple' | 'blue' | 'green';

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  color?: ColorVariant;
}

const colorClasses: Record<ColorVariant, { active: string; inactive: string }> = {
  orange: {
    active: 'bg-orange-600 text-white',
    inactive: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  },
  purple: {
    active: 'bg-purple-600 text-white',
    inactive: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  },
  blue: {
    active: 'bg-blue-600 text-white',
    inactive: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  },
  green: {
    active: 'bg-green-600 text-white',
    inactive: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }
};

const PageSizeSelector: React.FC<PageSizeSelectorProps> = ({
  pageSize,
  onPageSizeChange,
  color = 'orange'
}) => {
  const sizes = [20, 50, 100];
  const classes = colorClasses[color];

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
              ${pageSize === size ? classes.active : classes.inactive}
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