import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { findEmptyCategories, type EmptyCategoriesResult, type EmptyCategoryItem, type ScanProgress, type InventoryModule } from '../../services/categories/emptyCategories';

interface EmptyCheckerProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  module: InventoryModule;
}

const EmptyChecker: React.FC<EmptyCheckerProps> = ({ isOpen, onClose, onBack, module }) => {
  const { currentUser } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyCategories, setEmptyCategories] = useState<EmptyCategoriesResult | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<ScanProgress>({ current: 0, total: 100, stage: 'Initializing...' });

  useEffect(() => {
    if (isOpen && currentUser?.uid) {
      loadEmptyCategories();
    }
  }, [isOpen, currentUser?.uid]);

  const loadEmptyCategories = async () => {
    if (!currentUser?.uid) return;

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: 100, stage: 'Initializing...' });

    try {
      const result = await findEmptyCategories(currentUser.uid, module, (prog) => {
        setProgress(prog);
      });
      
      if (result.success && result.data) {
        setEmptyCategories(result.data);
      } else {
        setError(result.error?.toString() || 'Failed to load empty categories');
      }
    } catch (err) {
      console.error('Error loading empty categories:', err);
      setError('An error occurred while scanning for empty categories');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const buildHierarchyPath = (item: EmptyCategoryItem): string => {
    const parts: string[] = [];
    
    if (item.hierarchyPath.trade) parts.push(item.hierarchyPath.trade);
    if (item.hierarchyPath.section) parts.push(item.hierarchyPath.section);
    if (item.hierarchyPath.category) parts.push(item.hierarchyPath.category);
    if (item.hierarchyPath.subcategory) parts.push(item.hierarchyPath.subcategory);
    
    return parts.join(' > ');
  };

  const renderCategorySection = (
    title: string,
    items: EmptyCategoryItem[],
    icon: React.ReactNode
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="text-lg font-semibold text-gray-900">
            {title} ({items.length})
          </h3>
        </div>
        
        <div className="space-y-2">
          {items.map(item => {
            const isExpanded = expandedItems.has(item.id);
            const hierarchyPath = buildHierarchyPath(item);
            
            return (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:border-orange-300 transition-colors"
              >
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full flex items-center gap-3 p-4 bg-white hover:bg-orange-50 transition-colors text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                  <span className="font-medium text-gray-900">{item.name}</span>
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 bg-orange-50 border-t border-orange-100">
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">Path:</span> {hierarchyPath}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const totalEmpty = emptyCategories
    ? emptyCategories.sections.length +
      emptyCategories.categories.length +
      emptyCategories.subcategories.length +
      emptyCategories.types.length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Utilities"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Empty Category Checker</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-6" />
              
              {/* Progress Bar */}
              <div className="w-full max-w-md mb-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700">{progress.stage}</p>
                  <p className="text-sm font-medium text-gray-700">{progress.current}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-orange-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress.current}%` }}
                  />
                </div>
              </div>
              
              <p className="text-gray-500 text-sm text-center mt-2">
                Please wait while we scan your inventory...
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && emptyCategories && totalEmpty === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                All Categories Have Products!
              </h3>
              <p className="text-gray-600 text-center max-w-md">
                No empty categories were found. All your category leaf nodes have at least one product assigned.
              </p>
            </div>
          )}

          {!loading && !error && emptyCategories && totalEmpty > 0 && (
            <>
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-1">
                      {totalEmpty} Empty {totalEmpty === 1 ? 'Category' : 'Categories'} Found
                    </h3>
                    <p className="text-sm text-yellow-700">
                      The following categories have no products assigned. Click on any category to view its full hierarchical path.
                    </p>
                  </div>
                </div>
              </div>

              {renderCategorySection(
                'Empty Sections',
                emptyCategories.sections,
                <div className="w-2 h-2 bg-orange-600 rounded-full" />
              )}

              {renderCategorySection(
                'Empty Categories',
                emptyCategories.categories,
                <div className="w-2 h-2 bg-orange-600 rounded-full" />
              )}

              {renderCategorySection(
                'Empty Subcategories',
                emptyCategories.subcategories,
                <div className="w-2 h-2 bg-orange-600 rounded-full" />
              )}

              {renderCategorySection(
                'Empty Types',
                emptyCategories.types,
                <div className="w-2 h-2 bg-orange-600 rounded-full" />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onBack}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Back to Utilities
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyChecker;
