// src/pages/collections/components/CategorySelectorModal.tsx
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Loader2 } from 'lucide-react';
import type { CollectionContentType, CategoryTab } from '../../../services/collections';
import { getProducts } from '../../../services/inventory/products';
import { getLaborItems } from '../../../services/inventory/labor';

interface CategorySelectorModalProps {
  contentType: CollectionContentType;
  collectionId: string;
  existingTabs: CategoryTab[];
  onClose: () => void;
  onSubmit: (newTabs: CategoryTab[]) => void;
}

const CategorySelectorModal: React.FC<CategorySelectorModalProps> = ({
  contentType,
  collectionId,
  existingTabs,
  onClose,
  onSubmit,
}) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Selection state
  const [selectedTrade, setSelectedTrade] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);

  // Available options
  const [trades, setTrades] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);

  // Load trades on mount
  useEffect(() => {
    loadTrades();
  }, [contentType]);

  // Load sections when trade changes
  useEffect(() => {
    if (selectedTrade) {
      loadSections();
    }
  }, [selectedTrade]);

  // Load categories when sections change
  useEffect(() => {
    if (selectedSections.length > 0) {
      loadCategories();
    }
  }, [selectedSections]);

  // Load subcategories when categories change (for products, tools, equipment only)
  useEffect(() => {
    if (selectedCategories.length > 0 && contentType !== 'labor') {
      loadSubcategories();
    }
  }, [selectedCategories]);

  const loadTrades = async () => {
    setIsLoading(true);
    try {
      let result;
      if (contentType === 'products' || contentType === 'tools' || contentType === 'equipment') {
        result = await getProducts({ pageSize: 1000 });
      } else {
        result = await getLaborItems('user-id', {}, 1000); // TODO: Get userId
      }

      if (result.success && result.data) {
        const items = Array.isArray(result.data) ? result.data : result.data.laborItems || [];
        const uniqueTrades = Array.from(new Set(items.map((item: any) => item.trade).filter(Boolean)));
        setTrades(uniqueTrades.sort());
      }
    } catch (err) {
      setError('Failed to load trades');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSections = async () => {
    setIsLoading(true);
    try {
      let result;
      if (contentType === 'products' || contentType === 'tools' || contentType === 'equipment') {
        result = await getProducts({ 
          trade: selectedTrade,
          productType: contentType === 'products' ? undefined : contentType,
          pageSize: 1000 
        });
      } else {
        result = await getLaborItems('user-id', { trade: selectedTrade }, 1000);
      }

      if (result.success && result.data) {
        const items = Array.isArray(result.data) ? result.data : result.data.laborItems || [];
        const uniqueSections = Array.from(new Set(items.map((item: any) => item.section).filter(Boolean)));
        setSections(uniqueSections.sort());
      }
    } catch (err) {
      setError('Failed to load sections');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      let result;
      if (contentType === 'products' || contentType === 'tools' || contentType === 'equipment') {
        result = await getProducts({ 
          trade: selectedTrade,
          productType: contentType === 'products' ? undefined : contentType,
          pageSize: 1000 
        });
      } else {
        result = await getLaborItems('user-id', { trade: selectedTrade }, 1000);
      }

      if (result.success && result.data) {
        const items = Array.isArray(result.data) ? result.data : result.data.laborItems || [];
        const filteredItems = items.filter((item: any) => 
          selectedSections.includes(item.section)
        );
        const uniqueCategories = Array.from(new Set(filteredItems.map((item: any) => item.category).filter(Boolean)));
        setCategories(uniqueCategories.sort());
      }
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubcategories = async () => {
    setIsLoading(true);
    try {
      const result = await getProducts({ 
        trade: selectedTrade,
        productType: contentType === 'products' ? undefined : contentType,
        pageSize: 1000 
      });

      if (result.success && result.data) {
        const items = Array.isArray(result.data) ? result.data : [];
        const filteredItems = items.filter((item: any) => 
          selectedSections.includes(item.section) &&
          selectedCategories.includes(item.category)
        );
        const uniqueSubcategories = Array.from(new Set(filteredItems.map((item: any) => item.subcategory).filter(Boolean)));
        setSubcategories(uniqueSubcategories.sort());
      }
    } catch (err) {
      setError('Failed to load subcategories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedTrade) {
      setError('Please select a trade');
      return;
    }
    if (step === 2 && selectedSections.length === 0) {
      setError('Please select at least one section');
      return;
    }
    if (step === 3 && selectedCategories.length === 0) {
      setError('Please select at least one category');
      return;
    }
    
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Fetch items to create tabs
      let result;
      if (contentType === 'products' || contentType === 'tools' || contentType === 'equipment') {
        result = await getProducts({ 
          trade: selectedTrade,
          productType: contentType === 'products' ? undefined : contentType,
          pageSize: 1000 
        });
      } else {
        result = await getLaborItems('user-id', { trade: selectedTrade }, 1000);
      }

      if (!result.success || !result.data) {
        throw new Error('Failed to load items');
      }

      const items = Array.isArray(result.data) ? result.data : result.data.laborItems || [];

      // Filter items based on selections
      const filteredItems = items.filter((item: any) => {
        const matchesSection = selectedSections.includes(item.section);
        const matchesCategory = selectedCategories.includes(item.category);
        const matchesSubcategory = contentType === 'labor' ? true : 
          selectedSubcategories.length === 0 || selectedSubcategories.includes(item.subcategory);
        
        return matchesSection && matchesCategory && matchesSubcategory;
      });

      // Group by category to create tabs
      const categoryGroups = new Map<string, any[]>();
      filteredItems.forEach((item: any) => {
        const key = `${item.section}::${item.category}`;
        if (!categoryGroups.has(key)) {
          categoryGroups.set(key, []);
        }
        categoryGroups.get(key)!.push(item);
      });

      // Create new tabs
      const newTabs: CategoryTab[] = Array.from(categoryGroups.entries()).map(([key, items]) => {
        const [section, category] = key.split('::');
        const subcats = Array.from(new Set(items.map(i => i.subcategory).filter(Boolean)));
        
        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: contentType,
          name: category,
          section,
          category,
          subcategories: subcats,
          itemIds: items.map(i => i.id).filter(Boolean),
        };
      });

      // Filter out duplicates
      const filteredNewTabs = newTabs.filter(newTab => 
        !existingTabs.some(existing => 
          existing.section === newTab.section && 
          existing.category === newTab.category &&
          existing.type === newTab.type
        )
      );

      onSubmit(filteredNewTabs);
    } catch (err: any) {
      setError(err.message || 'Failed to create tabs');
    } finally {
      setIsLoading(false);
    }
  };

  const maxSteps = contentType === 'labor' ? 3 : 4;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Add {contentType.charAt(0).toUpperCase() + contentType.slice(1)} Categories
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Step {step} of {maxSteps}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2">
          <div className="flex items-center space-x-2">
            {Array.from({ length: maxSteps }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${
                  i < step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Step 1: Trade */}
              {step === 1 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Trade</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {trades.map((trade) => (
                      <button
                        key={trade}
                        onClick={() => setSelectedTrade(trade)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedTrade === trade
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <span className="font-medium text-gray-900">{trade}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Sections */}
              {step === 2 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Sections</h3>
                  <div className="space-y-2">
                    {sections.map((section) => (
                      <label
                        key={section}
                        className="flex items-center p-3 border-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(section)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSections([...selectedSections, section]);
                            } else {
                              setSelectedSections(selectedSections.filter(s => s !== section));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-3 font-medium text-gray-900">{section}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Categories */}
              {step === 3 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Categories</h3>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <label
                        key={category}
                        className="flex items-center p-3 border-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, category]);
                            } else {
                              setSelectedCategories(selectedCategories.filter(c => c !== category));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-3 font-medium text-gray-900">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Subcategories (only for products, tools, equipment) */}
              {step === 4 && contentType !== 'labor' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Select Subcategories (Optional)
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Leave empty to include all subcategories
                  </p>
                  <div className="space-y-2">
                    {subcategories.map((subcategory) => (
                      <label
                        key={subcategory}
                        className="flex items-center p-3 border-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubcategories.includes(subcategory)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubcategories([...selectedSubcategories, subcategory]);
                            } else {
                              setSelectedSubcategories(selectedSubcategories.filter(s => s !== subcategory));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-3 font-medium text-gray-900">{subcategory}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={step === maxSteps ? handleSubmit : handleNext}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : step === maxSteps ? (
              'Add Categories'
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategorySelectorModal;