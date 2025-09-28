import React, { useState, useEffect } from 'react';
import { 
  X,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  Search,
  Layers,
  Plus
} from 'lucide-react';
import {
  getProductTrades,
  getProductSections,
  getProductCategories,
  getProductSubcategories,
  getProductTypes,
  addProductTrade,
  addProductSection,
  addProductCategory,
  addProductSubcategory,
  addProductType
} from '../../../services/productCategories';

interface CollectionCategorySelectorProps {
  collectionName: string;
  onComplete?: (selectedCategories: CategorySelection) => void;
  onClose?: () => void;
}

export interface CategorySelection {
  trade?: string;
  sections: string[];
  categories: string[];
  subcategories: string[];
  types: string[];
  description?: string;
}

interface CategoryNode {
  id: string;
  name: string;
  level: 'trade' | 'section' | 'category' | 'subcategory' | 'type';
  parentId?: string;
  children?: CategoryNode[];
  isExpanded?: boolean;
  isSelected?: boolean;
  isLoading?: boolean;
}

const CollectionCategorySelector: React.FC<CollectionCategorySelectorProps> = ({ 
  collectionName, 
  onComplete, 
  onClose 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [description, setDescription] = useState('');
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [addingNewItem, setAddingNewItem] = useState<{level: string; parentId?: string} | null>(null);
  const [newItemName, setNewItemName] = useState('');
  
  // Mock user ID - replace with actual user ID from auth context
  const userId = 'current-user-id';

  // Load initial trades on mount
  useEffect(() => {
    loadTrades();
  }, []);

  const loadTrades = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getProductTrades(userId);
      
      if (result.success && result.data) {
        const trades: CategoryNode[] = result.data.map(trade => ({
          id: trade.id || '',
          name: trade.name,
          level: 'trade' as const,
          isExpanded: false,
          children: []
        }));
        
        setCategoryTree(trades);
      } else {
        setError('Failed to load categories');
      }
    } catch (err) {
      setError('Error loading categories');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSections = async (tradeNode: CategoryNode) => {
    if (!tradeNode.id) return;
    
    try {
      const result = await getProductSections(tradeNode.id, userId);
      
      if (result.success && result.data) {
        const sections: CategoryNode[] = result.data.map(section => ({
          id: section.id || '',
          name: section.name,
          level: 'section' as const,
          parentId: tradeNode.id,
          isExpanded: false,
          children: []
        }));
        
        updateNodeChildren(tradeNode.id, sections);
      }
    } catch (err) {
      console.error('Error loading sections:', err);
    }
  };

  const loadCategories = async (sectionNode: CategoryNode) => {
    if (!sectionNode.id) return;
    
    try {
      const result = await getProductCategories(sectionNode.id, userId);
      
      if (result.success && result.data) {
        const categories: CategoryNode[] = result.data.map(category => ({
          id: category.id || '',
          name: category.name,
          level: 'category' as const,
          parentId: sectionNode.id,
          isExpanded: false,
          children: []
        }));
        
        updateNodeChildren(sectionNode.id, categories);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadSubcategories = async (categoryNode: CategoryNode) => {
    if (!categoryNode.id) return;
    
    try {
      const result = await getProductSubcategories(categoryNode.id, userId);
      
      if (result.success && result.data) {
        const subcategories: CategoryNode[] = result.data.map(subcategory => ({
          id: subcategory.id || '',
          name: subcategory.name,
          level: 'subcategory' as const,
          parentId: categoryNode.id,
          isExpanded: false,
          children: []
        }));
        
        updateNodeChildren(categoryNode.id, subcategories);
      }
    } catch (err) {
      console.error('Error loading subcategories:', err);
    }
  };

  const loadTypes = async (subcategoryNode: CategoryNode) => {
    if (!subcategoryNode.id) return;
    
    try {
      const result = await getProductTypes(subcategoryNode.id, userId);
      
      if (result.success && result.data) {
        const types: CategoryNode[] = result.data.map(type => ({
          id: type.id || '',
          name: type.name,
          level: 'type' as const,
          parentId: subcategoryNode.id,
          isExpanded: false,
          children: []
        }));
        
        updateNodeChildren(subcategoryNode.id, types);
      }
    } catch (err) {
      console.error('Error loading types:', err);
    }
  };

  const updateNodeChildren = (nodeId: string, children: CategoryNode[]) => {
    const updateNode = (nodes: CategoryNode[]): CategoryNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, children, isLoading: false };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setCategoryTree(updateNode(categoryTree));
  };

  const toggleExpand = async (node: CategoryNode) => {
    // First, toggle the expansion state
    const updateExpansion = (nodes: CategoryNode[]): CategoryNode[] => {
      return nodes.map(n => {
        if (n.id === node.id) {
          return { ...n, isExpanded: !n.isExpanded, isLoading: !n.isExpanded };
        }
        if (n.children) {
          return { ...n, children: updateExpansion(n.children) };
        }
        return n;
      });
    };
    setCategoryTree(updateExpansion(categoryTree));

    // Load children if expanding and not already loaded
    if (!node.isExpanded && (!node.children || node.children.length === 0)) {
      switch (node.level) {
        case 'trade':
          await loadSections(node);
          break;
        case 'section':
          await loadCategories(node);
          break;
        case 'category':
          await loadSubcategories(node);
          break;
        case 'subcategory':
          await loadTypes(node);
          break;
      }
    }
  };

  // Recursive function to get all descendant IDs
  const getAllDescendantIds = (node: CategoryNode): string[] => {
    let ids = [node.id];
    
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        ids = [...ids, ...getAllDescendantIds(child)];
      });
    }
    
    return ids;
  };

  // Toggle selection with automatic child selection
  const toggleSelect = async (node: CategoryNode) => {
    const newSelectedItems = new Set(selectedItems);
    
    // First ensure all children are loaded if this is being selected
    if (!selectedItems.has(node.id) && (!node.children || node.children.length === 0)) {
      // Load children before selecting
      switch (node.level) {
        case 'trade':
          await loadSections(node);
          break;
        case 'section':
          await loadCategories(node);
          break;
        case 'category':
          await loadSubcategories(node);
          break;
        case 'subcategory':
          await loadTypes(node);
          break;
      }
    }
    
    // Get updated node with children
    const findNode = (nodes: CategoryNode[]): CategoryNode | null => {
      for (const n of nodes) {
        if (n.id === node.id) return n;
        if (n.children) {
          const found = findNode(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const updatedNode = findNode(categoryTree) || node;
    const descendantIds = getAllDescendantIds(updatedNode);
    
    if (selectedItems.has(node.id)) {
      // Deselect this node and all descendants
      descendantIds.forEach(id => newSelectedItems.delete(id));
    } else {
      // Select this node and all descendants
      descendantIds.forEach(id => newSelectedItems.add(id));
    }
    
    setSelectedItems(newSelectedItems);
  };

  // Get selection counts
  const getSelectionCounts = () => {
    let trades = 0, sections = 0, categories = 0, subcategories = 0, types = 0;
    
    const countNode = (nodes: CategoryNode[]) => {
      nodes.forEach(node => {
        if (selectedItems.has(node.id)) {
          switch (node.level) {
            case 'trade': trades++; break;
            case 'section': sections++; break;
            case 'category': categories++; break;
            case 'subcategory': subcategories++; break;
            case 'type': types++; break;
          }
        }
        if (node.children) {
          countNode(node.children);
        }
      });
    };
    
    countNode(categoryTree);
    return { trades, sections, categories, subcategories, types };
  };

  // Build selection object
  const buildSelection = (): CategorySelection => {
    const selection: CategorySelection = {
      trade: '',
      sections: [],
      categories: [],
      subcategories: [],
      types: [],
      description
    };

    const processNode = (nodes: CategoryNode[]) => {
      nodes.forEach(node => {
        if (selectedItems.has(node.id)) {
          switch (node.level) {
            case 'trade': 
              selection.trade = node.name; 
              break;
            case 'section': 
              selection.sections.push(node.name); 
              break;
            case 'category': 
              selection.categories.push(node.name); 
              break;
            case 'subcategory': 
              selection.subcategories.push(node.name); 
              break;
            case 'type': 
              selection.types.push(node.name); 
              break;
          }
        }
        if (node.children) {
          processNode(node.children);
        }
      });
    };

    processNode(categoryTree);
    return selection;
  };

  const handleApply = () => {
    const selection = buildSelection();
    onComplete?.(selection);
  };

  const clearAll = () => {
    setSelectedItems(new Set());
  };

  const handleAddNewItem = async () => {
    if (!newItemName.trim() || !addingNewItem) return;

    try {
      let result;
      switch (addingNewItem.level) {
        case 'trade':
          result = await addProductTrade(newItemName, userId);
          if (result.success) await loadTrades();
          break;
        case 'section':
          if (addingNewItem.parentId) {
            result = await addProductSection(newItemName, addingNewItem.parentId, userId);
            if (result.success) {
              const tradeNode = categoryTree.find(n => n.id === addingNewItem.parentId);
              if (tradeNode) await loadSections(tradeNode);
            }
          }
          break;
        case 'category':
          if (addingNewItem.parentId) {
            result = await addProductCategory(newItemName, addingNewItem.parentId, userId);
            if (result.success) {
              const findNode = (nodes: CategoryNode[]): CategoryNode | null => {
                for (const n of nodes) {
                  if (n.id === addingNewItem.parentId) return n;
                  if (n.children) {
                    const found = findNode(n.children);
                    if (found) return found;
                  }
                }
                return null;
              };
              const sectionNode = findNode(categoryTree);
              if (sectionNode) await loadCategories(sectionNode);
            }
          }
          break;
        case 'subcategory':
          if (addingNewItem.parentId) {
            result = await addProductSubcategory(newItemName, addingNewItem.parentId, userId);
            if (result.success) {
              const findNode = (nodes: CategoryNode[]): CategoryNode | null => {
                for (const n of nodes) {
                  if (n.id === addingNewItem.parentId) return n;
                  if (n.children) {
                    const found = findNode(n.children);
                    if (found) return found;
                  }
                }
                return null;
              };
              const categoryNode = findNode(categoryTree);
              if (categoryNode) await loadSubcategories(categoryNode);
            }
          }
          break;
        case 'type':
          if (addingNewItem.parentId) {
            result = await addProductType(newItemName, addingNewItem.parentId, userId);
            if (result.success) {
              const findNode = (nodes: CategoryNode[]): CategoryNode | null => {
                for (const n of nodes) {
                  if (n.id === addingNewItem.parentId) return n;
                  if (n.children) {
                    const found = findNode(n.children);
                    if (found) return found;
                  }
                }
                return null;
              };
              const subcategoryNode = findNode(categoryTree);
              if (subcategoryNode) await loadTypes(subcategoryNode);
            }
          }
          break;
      }

      setAddingNewItem(null);
      setNewItemName('');
    } catch (err) {
      console.error('Error adding new item:', err);
    }
  };

  // Render category node recursively
  const renderNode = (node: CategoryNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const canHaveChildren = node.level !== 'type';
    const isSelected = selectedItems.has(node.id);
    const isExpanded = node.isExpanded;

    const levelColors = {
      trade: 'text-orange-600 bg-orange-50 border-orange-500',
      section: 'text-blue-600 bg-blue-50 border-blue-500',
      category: 'text-purple-600 bg-purple-50 border-purple-500',
      subcategory: 'text-green-600 bg-green-50 border-green-500',
      type: 'text-gray-600 bg-gray-50 border-gray-500'
    };

    const levelLabels = {
      trade: 'Trade',
      section: 'Section',
      category: 'Category',
      subcategory: 'Subcategory',
      type: 'Type'
    };

    const getNextLevel = (currentLevel: string) => {
      const levels = { trade: 'section', section: 'category', category: 'subcategory', subcategory: 'type' };
      return levels[currentLevel as keyof typeof levels];
    };

    return (
      <div key={node.id}>
        <div 
          className={`
            flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors
            ${isExpanded ? 'bg-gray-50' : ''}
            ${isSelected ? 'border-l-4 ' + levelColors[node.level].split(' ')[2] : ''}
          `}
          style={{ paddingLeft: `${(depth * 24) + 12}px` }}
        >
          <div 
            className="flex items-center flex-1"
            onClick={() => canHaveChildren && toggleExpand(node)}
          >
            {canHaveChildren && (
              <ChevronRight 
                className={`w-4 h-4 mr-2 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            )}
            {!canHaveChildren && (
              <span className="w-4 mr-2" />
            )}
            <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
              {node.name}
            </span>
            {node.isLoading && (
              <Loader2 className="w-3 h-3 ml-2 animate-spin text-gray-400" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(node)}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
            <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[node.level].split(' ').slice(0, 2).join(' ')}`}>
              {levelLabels[node.level]}
            </span>
          </div>
        </div>
        
        {isExpanded && (
          <>
            {node.children && node.children.map(child => renderNode(child, depth + 1))}
            
            {canHaveChildren && (
              <div 
                className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-blue-600"
                style={{ paddingLeft: `${((depth + 1) * 24) + 12}px` }}
                onClick={() => {
                  setAddingNewItem({ level: getNextLevel(node.level), parentId: node.id });
                  setNewItemName('');
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add new {getNextLevel(node.level)}</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const counts = getSelectionCounts();
  const hasSelection = selectedItems.size > 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Select Categories for Collection</h3>
                <p className="text-sm text-gray-500 mt-1">{collectionName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Category Tree */}
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="mx-4 my-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              </div>
            ) : categoryTree.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No categories found</p>
                <button
                  onClick={() => {
                    setAddingNewItem({ level: 'trade' });
                    setNewItemName('');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4" />
                  Add First Trade
                </button>
              </div>
            ) : (
              <div className="py-2">
                {categoryTree.map(node => renderNode(node, 0))}
                <div 
                  className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-blue-600"
                  onClick={() => {
                    setAddingNewItem({ level: 'trade' });
                    setNewItemName('');
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add new trade</span>
                </div>
              </div>
            )}
          </div>

          {/* Add New Item Dialog */}
          {addingNewItem && (
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`New ${addingNewItem.level} name`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNewItem()}
                />
                <button
                  onClick={handleAddNewItem}
                  disabled={!newItemName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setAddingNewItem(null);
                    setNewItemName('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Selection Summary */}
          {hasSelection && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">
                  <strong>Selected:</strong>
                  {counts.trades > 0 && ` ${counts.trades} Trade${counts.trades > 1 ? 's' : ''}`}
                  {counts.sections > 0 && `, ${counts.sections} Section${counts.sections > 1 ? 's' : ''}`}
                  {counts.categories > 0 && `, ${counts.categories} Categor${counts.categories > 1 ? 'ies' : 'y'}`}
                  {counts.subcategories > 0 && `, ${counts.subcategories} Subcategor${counts.subcategories > 1 ? 'ies' : 'y'}`}
                  {counts.types > 0 && `, ${counts.types} Type${counts.types > 1 ? 's' : ''}`}
                </div>
                <button
                  onClick={clearAll}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear All
                </button>
              </div>
              
              {/* Description field */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Add a description for this collection (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center rounded-b-lg">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Layers className="w-4 h-4" />
              <span>Select parent to include all children</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!hasSelection}
                className={`
                  px-4 py-2 rounded-lg transition-colors flex items-center gap-2
                  ${hasSelection 
                    ? 'bg-orange-600 text-white hover:bg-orange-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <Check className="w-4 h-4" />
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CollectionCategorySelector;