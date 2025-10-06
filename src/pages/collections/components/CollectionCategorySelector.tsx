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
import { useAuthContext } from '../../../contexts/AuthContext';

interface CollectionCategorySelectorProps {
  collectionName: string;
  onComplete?: (selectedCategories: CategorySelection) => void;
  onClose?: () => void;
}

export interface CategorySelection {
  collectionName?: string;
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
  const [collectionTitle, setCollectionTitle] = useState(collectionName || 'New Collection');
  
  // Get authenticated user from context
  const { currentUser } = useAuthContext();
  const userId = currentUser?.uid || '';

  // Load initial trades on mount
  useEffect(() => {
    if (userId) {
      loadTrades();
    } else {
      setError('User not authenticated');
      setIsLoading(false);
    }
  }, [userId]);

  const loadTrades = async () => {
    console.log('🔄 Loading trades for user:', userId);
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getProductTrades(userId);
      console.log('📦 Trades result:', result);
      
      if (result.success && result.data) {
        const trades: CategoryNode[] = result.data.map(trade => ({
          id: trade.id || '',
          name: trade.name,
          level: 'trade' as const,
          isExpanded: false,
          children: []
        }));
        
        console.log('✅ Trades loaded:', trades);
        setCategoryTree(trades);
      } else {
        console.error('❌ Failed to load trades:', result);
        setError('Failed to load categories');
      }
    } catch (err) {
      setError('Error loading categories');
      console.error('❌ Error in loadTrades:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSections = async (tradeNode: CategoryNode) => {
    console.log('🔄 Loading sections for trade:', tradeNode.name, 'ID:', tradeNode.id);
    // Use trade name instead of ID since that's how it's stored in Firebase
    const tradeIdentifier = tradeNode.name;
    console.log('🔍 Using trade identifier:', tradeIdentifier);
    
    try {
      const result = await getProductSections(tradeIdentifier, userId);
      console.log('📦 Sections result for trade', tradeNode.name + ':', result);
      
      if (result.success && result.data) {
        const sections: CategoryNode[] = result.data.map(section => ({
          id: section.id || '',
          name: section.name,
          level: 'section' as const,
          parentId: tradeNode.id,
          isExpanded: false,
          children: []
        }));
        
        console.log('✅ Sections loaded for', tradeNode.name + ':', sections);
        updateNodeChildren(tradeNode.id, sections);
      } else {
        console.warn('⚠️ No sections found for trade:', tradeNode.name);
        updateNodeChildren(tradeNode.id, []);
      }
    } catch (err) {
      console.error('❌ Error loading sections for', tradeNode.name + ':', err);
    }
  };

  const getChildLevel = (parentLevel: string): 'trade' | 'section' | 'category' | 'subcategory' | 'type' => {
  const levelMap: Record<string, 'trade' | 'section' | 'category' | 'subcategory' | 'type'> = {
    trade: 'section',
    section: 'category',
    category: 'subcategory',
    subcategory: 'type'
  };
  return levelMap[parentLevel] || 'type';
};

const loadChildrenData = async (node: CategoryNode): Promise<CategoryNode[]> => {
  try {
    let result;
    switch (node.level) {
      case 'trade':
        result = await getProductSections(node.name, userId);
        break;
      case 'section':
        result = await getProductCategories(node.id, userId);
        if ((!result.success || !result.data || result.data.length === 0) && node.name) {
          result = await getProductCategories(node.name, userId);
        }
        break;
      case 'category':
        result = await getProductSubcategories(node.id, userId);
        break;
      case 'subcategory':
        result = await getProductTypes(node.id, userId);
        break;
      default:
        return [];
    }
    
    if (result && result.success && result.data) {
      const childLevel = getChildLevel(node.level);
      return result.data.map((item: any) => ({
        id: item.id || '',
        name: item.name,
        level: childLevel,
        parentId: node.id,
        isExpanded: false,
        children: []
      }));
    }
  } catch (err) {
    console.error('Error loading children for', node.name + ':', err);
  }
  return [];
};

const getAllDescendantIdsRecursive = async (node: CategoryNode): Promise<string[]> => {
  let allIds = [node.id];
  
  // Don't load children for type level (leaf nodes)
  if (node.level === 'type') {
    return allIds;
  }
  
  // Load children if not already loaded
  let children = node.children || [];
  if (children.length === 0) {
    console.log('📥 Loading children for:', node.name);
    children = await loadChildrenData(node);
    // Update the tree with these children so UI shows them
    if (children.length > 0) {
      updateNodeChildren(node.id, children);
    }
  }
  
  // 🚀 PARALLEL LOADING: Process all children simultaneously instead of sequentially
  if (children.length > 0) {
    console.log(`🔄 Loading ${children.length} children in parallel for ${node.name}`);
    const childPromises = children.map(child => getAllDescendantIdsRecursive(child));
    const childResults = await Promise.all(childPromises);
    
    // Flatten all child IDs into single array
    childResults.forEach(childIds => {
      allIds = [...allIds, ...childIds];
    });
  }
  
  console.log(`✅ Loaded ${allIds.length} total descendants for ${node.name}`);
  return allIds;
};


  const loadCategories = async (sectionNode: CategoryNode) => {
    console.log('🔄 Loading categories for section:', sectionNode.name, 'ID:', sectionNode.id);
    if (!sectionNode.id) {
      console.error('❌ No section ID provided');
      return;
    }
    
    try {
      // Try with ID first, then fall back to name if no results
      let result = await getProductCategories(sectionNode.id, userId);
      
      if ((!result.success || !result.data || result.data.length === 0) && sectionNode.name) {
        console.log('🔄 No categories found with ID, trying with name:', sectionNode.name);
        result = await getProductCategories(sectionNode.name, userId);
      }
      
      console.log('📦 Categories result for section', sectionNode.name + ':', result);
      
      if (result.success && result.data) {
        const categories: CategoryNode[] = result.data.map(category => ({
          id: category.id || '',
          name: category.name,
          level: 'category' as const,
          parentId: sectionNode.id,
          isExpanded: false,
          children: []
        }));
        
        console.log('✅ Categories loaded for', sectionNode.name + ':', categories);
        updateNodeChildren(sectionNode.id, categories);
      } else {
        console.warn('⚠️ No categories found for section:', sectionNode.name);
        updateNodeChildren(sectionNode.id, []);
      }
    } catch (err) {
      console.error('❌ Error loading categories:', err);
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
          // Keep the node expanded even if children is empty
          return { ...node, children, isLoading: false, isExpanded: true };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setCategoryTree(prev => {
      const updated = updateNode(prev);
      console.log('🔄 Updated tree after loading children for nodeId:', nodeId, 'Children count:', children.length);
      return updated;
    });
  };

  const toggleExpand = async (node: CategoryNode) => {
    console.log('🔄 Toggle expand for:', node.name, 'Level:', node.level, 'Current expanded:', node.isExpanded);
    
    // First, toggle the expansion state optimistically
    const updateExpansion = (nodes: CategoryNode[]): CategoryNode[] => {
      return nodes.map(n => {
        if (n.id === node.id) {
          const newExpanded = !n.isExpanded;
          console.log('📝 Setting', n.name, 'expanded to:', newExpanded);
          return { ...n, isExpanded: newExpanded, isLoading: newExpanded && (!n.children || n.children.length === 0) };
        }
        if (n.children) {
          return { ...n, children: updateExpansion(n.children) };
        }
        return n;
      });
    };
    setCategoryTree(updateExpansion(categoryTree));

    // Load children if expanding and not already loaded
    if (!node.isExpanded) {
      // Check if we need to load children
      if (!node.children || node.children.length === 0) {
        console.log('📥 Loading children for:', node.name, 'Level:', node.level);
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
      } else {
        console.log('✅ Children already loaded for:', node.name, 'Count:', node.children.length);
      }
    } else {
      console.log('📂 Collapsing:', node.name);
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

const toggleSelect = async (node: CategoryNode) => {
  console.log('🔄 Toggle select for:', node.name, 'Level:', node.level, 'Currently selected:', selectedItems.has(node.id));
  const newSelectedItems = new Set(selectedItems);
  
  if (selectedItems.has(node.id)) {
    // DESELECTING - use existing tree structure
    const descendantIds = getAllDescendantIds(node);
    descendantIds.forEach(id => newSelectedItems.delete(id));
    console.log('❌ Deselected:', node.name, 'and', descendantIds.length - 1, 'descendants');
  } else {
    // SELECTING - recursively load all descendants first
    console.log('✅ Selecting:', node.name, '- loading all descendants...');
    const descendantIds = await getAllDescendantIdsRecursive(node);
    descendantIds.forEach(id => newSelectedItems.add(id));
    console.log('✅ Selected:', node.name, 'and', descendantIds.length - 1, 'descendants');
  }
  
  setSelectedItems(newSelectedItems);
  console.log('📊 Total selected items:', newSelectedItems.size);
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

  // Build selection object - now handles flexible selection across hierarchy
  const buildSelection = (): CategorySelection => {
    const selection: CategorySelection = {
      trade: '',
      sections: [],
      categories: [],
      subcategories: [],
      types: [],
      description
    };

    // Track selected trades for determining the primary trade
    const selectedTrades = new Set<string>();

    const processNode = (nodes: CategoryNode[]) => {
      nodes.forEach(node => {
        if (selectedItems.has(node.id)) {
          switch (node.level) {
            case 'trade': 
              selectedTrades.add(node.name);
              if (!selection.trade) {
                selection.trade = node.name; // Set first selected trade as primary
              }
              break;
            case 'section': 
              selection.sections.push(node.name); 
              // Find parent trade
              const parentTrade = findParentTrade(node, categoryTree);
              if (parentTrade) selectedTrades.add(parentTrade);
              break;
            case 'category': 
              selection.categories.push(node.name);
              // Find parent trade for this category
              const catTrade = findParentTrade(node, categoryTree);
              if (catTrade) selectedTrades.add(catTrade);
              break;
            case 'subcategory': 
              selection.subcategories.push(node.name); 
              // Find parent trade for this subcategory
              const subTrade = findParentTrade(node, categoryTree);
              if (subTrade) selectedTrades.add(subTrade);
              break;
            case 'type': 
              selection.types.push(node.name); 
              // Find parent trade for this type
              const typeTrade = findParentTrade(node, categoryTree);
              if (typeTrade) selectedTrades.add(typeTrade);
              break;
          }
        }
        if (node.children) {
          processNode(node.children);
        }
      });
    };

    processNode(categoryTree);
    
    // If no trade was directly selected but we found trades from selected children,
    // use the first one as the primary trade
    if (!selection.trade && selectedTrades.size > 0) {
      selection.trade = Array.from(selectedTrades)[0];
    }
    
    // If we have multiple trades selected, add them to description
    if (selectedTrades.size > 1) {
      selection.description = `${selection.description ? selection.description + ' | ' : ''}Trades: ${Array.from(selectedTrades).join(', ')}`;
    }

    console.log('📊 Built selection with trade:', selection.trade, 'from trades:', Array.from(selectedTrades));
    return selection;
  };

  // Helper function to find parent trade of any node
  const findParentTrade = (node: CategoryNode, tree: CategoryNode[]): string | null => {
    for (const tradeNode of tree) {
      if (tradeNode.level === 'trade') {
        if (tradeNode.id === node.id) return tradeNode.name;
        if (findNodeInTree(node.id, tradeNode.children || [])) {
          return tradeNode.name;
        }
      }
    }
    return null;
  };

  const findNodeInTree = (nodeId: string, nodes: CategoryNode[]): boolean => {
    for (const n of nodes) {
      if (n.id === nodeId) return true;
      if (n.children && findNodeInTree(nodeId, n.children)) return true;
    }
    return false;
  };

  const handleApply = () => {
    console.log('🚀 handleApply called in CategorySelector');
    
    // Validate collection name
    if (!collectionTitle.trim()) {
      console.error('❌ No collection name provided');
      setError('Please enter a collection name');
      return;
    }
    
    const selection = buildSelection();
    console.log('📦 Built selection object:', selection);
    console.log('📊 Selection details:', {
      collectionName: collectionTitle,
      trade: selection.trade,
      sectionsCount: selection.sections.length,
      sections: selection.sections,
      categoriesCount: selection.categories.length,
      categories: selection.categories,
      subcategoriesCount: selection.subcategories.length,
      subcategories: selection.subcategories,
      typesCount: selection.types.length,
      types: selection.types,
      description: selection.description
    });
    
    // Validate that at least something is selected
    if (!selection.trade && 
        selection.sections.length === 0 && 
        selection.categories.length === 0 && 
        selection.subcategories.length === 0 && 
        selection.types.length === 0) {
      console.error('❌ No categories selected');
      setError('Please select at least one category');
      return;
    }
    
    // Add collection name to the selection
    const finalSelection = {
      ...selection,
      collectionName: collectionTitle.trim()
    };
    
    if (onComplete) {
      console.log('✅ Calling onComplete callback with selection');
      onComplete(finalSelection);
    } else {
      console.error('❌ No onComplete callback provided!');
    }
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
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Create New Collection</h3>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={collectionTitle}
                    onChange={(e) => setCollectionTitle(e.target.value)}
                    placeholder="Enter collection name..."
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors ml-4"
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