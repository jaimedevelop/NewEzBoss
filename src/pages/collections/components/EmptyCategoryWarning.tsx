import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface HierarchicalCategoryItem {
  name: string;
  tradeId?: string;
  tradeName?: string;
  sectionId?: string;
  sectionName?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}

interface EmptyCategoryWarningProps {
  isOpen: boolean;
  emptyCategories: HierarchicalCategoryItem[];
  onProceed: () => void;
  onCancel: () => void;
}

const EmptyCategoryWarning: React.FC<EmptyCategoryWarningProps> = ({
  isOpen,
  emptyCategories,
  onProceed,
  onCancel,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (showTooltip && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left,
        y: rect.bottom + 5
      });
    }
  }, [showTooltip]);

  if (!isOpen) return null;

  // Build hierarchical path for a category
  const buildCategoryPath = (item: HierarchicalCategoryItem): string => {
    const parts: string[] = [];

    if (item.tradeName) {
      parts.push(item.tradeName);
    }

    if (item.sectionName) {
      parts.push(item.sectionName);
    }

    if (item.categoryName) {
      parts.push(item.categoryName);
    }

    if (item.subcategoryName) {
      parts.push(item.subcategoryName);
    }

    // Add the item's own name at the end
    parts.push(item.name);

    return parts.join(' > ');
  };

  const remainingCategories = emptyCategories.slice(3);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">
              Empty Categories Detected
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              The following {emptyCategories.length === 1 ? 'category is' : 'categories are'} empty:
            </p>
            <ul className="text-sm text-gray-800 mb-3 list-disc list-inside bg-yellow-50 rounded p-2">
              {emptyCategories.slice(0, 3).map((cat, idx) => (
                <li key={idx} className="font-medium">{buildCategoryPath(cat)}</li>
              ))}
              {emptyCategories.length > 3 && (
                <li 
                  ref={triggerRef}
                  className="font-medium text-gray-600 italic cursor-help"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  And {emptyCategories.length - 3} other{emptyCategories.length - 3 > 1 ? 's' : ''}
                </li>
              )}
            </ul>
            <p className="text-sm text-gray-600">
              Would you like to add {emptyCategories.length === 1 ? 'this category' : 'these categories'} anyway? You can add items to {emptyCategories.length === 1 ? 'it' : 'them'} later.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Add Anyway
          </button>
        </div>
      </div>

      {/* Tooltip rendered via Portal at document root to avoid z-index stacking issues */}
      {showTooltip && emptyCategories.length > 3 && createPortal(
        <div 
          className="fixed bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 min-w-[250px] max-w-[400px]"
          style={{ 
            left: `${tooltipPosition.x}px`, 
            top: `${tooltipPosition.y}px`,
            zIndex: 99999
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="font-semibold mb-2">Remaining empty categories:</div>
          <ul className="space-y-1 list-disc list-inside">
            {remainingCategories.map((cat, idx) => (
              <li key={idx} className="break-words">{buildCategoryPath(cat)}</li>
            ))}
          </ul>
          {/* Arrow pointer */}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EmptyCategoryWarning;
