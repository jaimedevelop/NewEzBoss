// src/pages/collections/components/CollectionCategorySelector.tsx
import React, { useState, useEffect } from 'react';
import { 
  X,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  Layers,
  Plus,
  Package,
  Briefcase,
  Wrench,
  Truck
} from 'lucide-react';

// ✅ Product categories (shared trades + products-specific)
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
} from '../../../services/categories';

// ✅ Labor categories
import {
  getSections as getLaborSections,
  addSection as addLaborSection,
} from '../../../services/inventory/labor/sections';
import {
  getCategories as getLaborCategories,
  addCategory as addLaborCategory,
} from '../../../services/inventory/labor/categories';

// ✅ Tool categories
import {
  getToolSections,
  addToolSection,
} from '../../../services/inventory/tools/sections';
import {
  getToolCategories,
  addToolCategory,
} from '../../../services/inventory/tools/categories';
import {
  getToolSubcategories,
  addToolSubcategory,
} from '../../../services/inventory/tools/subcategories';

// ✅ Equipment categories
import {
  getEquipmentSections,
  addEquipmentSection,
} from '../../../services/inventory/equipment/sections';
import {
  getEquipmentCategories,
  addEquipmentCategory,
} from '../../../services/inventory/equipment/categories';
import {
  getEquipmentSubcategories,
  addEquipmentSubcategory,
} from '../../../services/inventory/equipment/subcategories';

import { useAuthContext } from '../../../contexts/AuthContext';
import type { CollectionContentType } from '../../../services/collections';

interface CollectionCategorySelectorProps {
  collectionName: string;
  contentType: CollectionContentType;
  initialSelection?: CategorySelection;
  onComplete?: (selectedCategories: CategorySelection) => void;
  onClose?: () => void;
}

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

export interface CategorySelection {
  collectionName?: string;
  trade?: string;
  sections: string[] | HierarchicalCategoryItem[];
  categories: string[] | HierarchicalCategoryItem[];
  subcategories: string[] | HierarchicalCategoryItem[];
  types?: string[] | HierarchicalCategoryItem[];
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
  contentType,
  initialSelection,
  onComplete, 
  onClose 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [description, setDescription] = useState(initialSelection?.description || '');
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [addingNewItem, setAddingNewItem] = useState<{level: string; parentId?: string; parentName?: string} | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [collectionTitle, setCollectionTitle] = useState(initialSelection?.collectionName || collectionName || 'New Collection');
  
  const { currentUser } = useAuthContext();
  const userId = currentUser?.uid || '';

  // ✅ Helper to get max depth for content type
  const getMaxLevel = (): CategoryNode['level'] => {
    switch (contentType) {
      case 'labor':
        return 'category'; // Labor: Trade → Section → Category
      case 'tools':
      case 'equipment':
        return 'subcategory'; // Tools/Equipment: Trade → Section → Category → Subcategory
      case 'products':
      default:
        return 'type'; // Products: Trade → Section → Category → Subcategory → Type
    }
  };

  // ✅ Helper to get content type icon and label
const getContentTypeInfo = () => {
  switch (contentType) {
    case 'products':
      return { icon: Package, label: 'Products', color: 'blue' };
    case 'labor':
      return { icon: Briefcase, label: 'Labor', color: 'purple' };
    case 'tools':
      return { icon: Wrench, label: 'Tools', color: 'orange' };
    case 'equipment':
      return { icon: Truck, label: 'Equipment', color: 'green' };
    default:
      return { icon: Package, label: 'Products', color: 'blue' }; // Default fallback
  }
};

  const { icon: ContentIcon, label: contentLabel } = getContentTypeInfo();

  useEffect(() => {
    if (userId) {
      loadTrades();
    } else {
      setError('User not authenticated');
      setIsLoading(false);
    }
  }, [userId, contentType]);

  const loadTrades = async () => {
    console.log('🔄 Loading trades for', contentType, 'user:', userId);
    setIsLoading(true);
    setError(null);
    
    try {
      // All types share product trades
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

  const getChildLevel = (parentLevel: string): 'trade' | 'section' | 'category' | 'subcategory' | 'type' => {
    const maxLevel = getMaxLevel();
    
    if (contentType === 'labor') {
      // Labor: trade → section → category
      const laborLevelMap: Record<string, 'trade' | 'section' | 'category'> = {
        trade: 'section',
        section: 'category',
      };
      return laborLevelMap[parentLevel] || 'category';
    } else if (contentType === 'tools' || contentType === 'equipment') {
      // Tools/Equipment: trade → section → category → subcategory
      const levelMap: Record<string, 'trade' | 'section' | 'category' | 'subcategory'> = {
        trade: 'section',
        section: 'category',
        category: 'subcategory',
      };
      return levelMap[parentLevel] || 'subcategory';
    } else {
      // Products: trade → section → category → subcategory → type
      const levelMap: Record<string, 'trade' | 'section' | 'category' | 'subcategory' | 'type'> = {
        trade: 'section',
        section: 'category',
        category: 'subcategory',
        subcategory: 'type'
      };
      return levelMap[parentLevel] || 'type';
    }
  };

  // ✅ Load children based on content type
  const loadChildrenData = async (node: CategoryNode): Promise<CategoryNode[]> => {
    try {
      let result;
      
      switch (contentType) {
        case 'products':
          // Products hierarchy
          switch (node.level) {
            case 'trade':
              result = await getProductSections(node.id, userId);
              break;
            case 'section':
              result = await getProductCategories(node.id, userId);
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
          break;

        case 'labor':
          // Labor hierarchy (no subcategories/types)
          switch (node.level) {
            case 'trade':
              result = await getLaborSections(node.id, userId);
              break;
            case 'section':
              result = await getLaborCategories(node.id, userId);
              break;
            default:
              return [];
          }
          break;

        case 'tools':
          // Tools hierarchy (no types)
          switch (node.level) {
            case 'trade':
              result = await getToolSections(node.id, userId);
              break;
            case 'section':
              result = await getToolCategories(node.id, userId);
              break;
            case 'category':
              result = await getToolSubcategories(node.id, userId);
              break;
            default:
              return [];
          }
          break;

        case 'equipment':
          // Equipment hierarchy (no types)
          switch (node.level) {
            case 'trade':
              result = await getEquipmentSections(node.id, userId);
              break;
            case 'section':
              result = await getEquipmentCategories(node.id, userId);
              break;
            case 'category':
              result = await getEquipmentSubcategories(node.id, userId);
              break;
            default:
              return [];
          }
          break;
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
    
    const maxLevel = getMaxLevel();
    if (node.level === maxLevel) {
      return allIds;
    }
    
    let children = node.children || [];
    if (children.length === 0) {
      console.log('📥 Loading children for:', node.name);
      children = await loadChildrenData(node);
      if (children.length > 0) {
        updateNodeChildren(node.id, children);
      }
    }
    
    if (children.length > 0) {
      console.log(`🔄 Loading ${children.length} children in parallel for ${node.name}`);
      const childPromises = children.map(child => getAllDescendantIdsRecursive(child));
      const childResults = await Promise.all(childPromises);
      
      childResults.forEach(childIds => {
        allIds = [...allIds, ...childIds];
      });
    }
    
    console.log(`✅ Loaded ${allIds.length} total descendants for ${node.name}`);
    return allIds;
  };

  const updateNodeChildren = (nodeId: string, children: CategoryNode[]) => {
    const updateNode = (nodes: CategoryNode[]): CategoryNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
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

    if (!node.isExpanded) {
      if (!node.children || node.children.length === 0) {
        console.log('📥 Loading children for:', node.name, 'Level:', node.level);
        const children = await loadChildrenData(node);
        if (children.length > 0) {
          updateNodeChildren(node.id, children);
        } else {
          updateNodeChildren(node.id, []);
        }
      } else {
        console.log('✅ Children already loaded for:', node.name, 'Count:', node.children.length);
      }
    } else {
      console.log('📂 Collapsing:', node.name);
    }
  };

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
      const descendantIds = getAllDescendantIds(node);
      descendantIds.forEach(id => newSelectedItems.delete(id));
      console.log('❌ Deselected:', node.name, 'and', descendantIds.length - 1, 'descendants');
    } else {
      console.log('✅ Selecting:', node.name, '- loading all descendants...');
      const descendantIds = await getAllDescendantIdsRecursive(node);
      descendantIds.forEach(id => newSelectedItems.add(id));
      console.log('✅ Selected:', node.name, 'and', descendantIds.length - 1, 'descendants');
    }
    
    setSelectedItems(newSelectedItems);
    console.log('📊 Total selected items:', newSelectedItems.size);
  };

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

const buildSelection = (): CategorySelection => {
  const selection: CategorySelection = {
    trade: '',
    sections: [],
    categories: [],
    subcategories: [],
    types: [],
    description
  };

  const selectedTrades = new Set<string>();

  // Helper to find parent nodes
  const findParentChain = (node: CategoryNode): {
    tradeId: string;
    tradeName: string;
    sectionId?: string;
    sectionName?: string;
    categoryId?: string;
    categoryName?: string;
  } | null => {
    // Find trade ancestor
    const tradeNode = categoryTree.find(t => 
      t.level === 'trade' && (t.id === node.id || findNodeInTree(node.id, t.children || []))
    );
    
    if (!tradeNode) return null;
    
    const chain: any = {
      tradeId: tradeNode.id,
      tradeName: tradeNode.name
    };
    
    // If node is in a section, find it
    if (node.level === 'category' || node.level === 'subcategory' || node.level === 'type') {
      const sectionNode = findParentNodeOfLevel(node, 'section', tradeNode.children || []);
      if (sectionNode) {
        chain.sectionId = sectionNode.id;
        chain.sectionName = sectionNode.name;
      }
    }
    
    // If node is in a category, find it
    if (node.level === 'subcategory' || node.level === 'type') {
      const categoryNode = findParentNodeOfLevel(node, 'category', tradeNode.children || []);
      if (categoryNode) {
        chain.categoryId = categoryNode.id;
        chain.categoryName = categoryNode.name;
      }
    }
    
    return chain;
  };
  
  // Helper to find parent node of specific level
  const findParentNodeOfLevel = (
    targetNode: CategoryNode, 
    level: CategoryNode['level'], 
    searchNodes: CategoryNode[]
  ): CategoryNode | null => {
    for (const node of searchNodes) {
      if (node.level === level && findNodeInTree(targetNode.id, node.children || [])) {
        return node;
      }
      if (node.children) {
        const found = findParentNodeOfLevel(targetNode, level, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const processNode = (nodes: CategoryNode[]) => {
    nodes.forEach(node => {
      if (selectedItems.has(node.id)) {
        const parentChain = findParentChain(node);
        
        if (!parentChain) {
          console.warn('⚠️ Could not find parent chain for:', node.name);
          return;
        }
        
        switch (node.level) {
          case 'trade': 
            selectedTrades.add(node.name);
            if (!selection.trade) {
              selection.trade = node.name;
            }
            break;
            
          case 'section': 
            selection.sections.push({
              name: node.name,
              tradeId: parentChain.tradeId,
              tradeName: parentChain.tradeName
            });
            selectedTrades.add(parentChain.tradeName);
            break;
            
          case 'category': 
            selection.categories.push({
              name: node.name,
              tradeId: parentChain.tradeId,
              tradeName: parentChain.tradeName,
              sectionId: parentChain.sectionId,
              sectionName: parentChain.sectionName
            });
            selectedTrades.add(parentChain.tradeName);
            break;
            
          case 'subcategory': 
            selection.subcategories.push({
              name: node.name,
              tradeId: parentChain.tradeId,
              tradeName: parentChain.tradeName,
              sectionId: parentChain.sectionId,
              sectionName: parentChain.sectionName,
              categoryId: parentChain.categoryId,
              categoryName: parentChain.categoryName
            });
            selectedTrades.add(parentChain.tradeName);
            break;
            
          case 'type': 
            selection.types.push({
              name: node.name,
              tradeId: parentChain.tradeId,
              tradeName: parentChain.tradeName,
              sectionId: parentChain.sectionId,
              sectionName: parentChain.sectionName,
              categoryId: parentChain.categoryId,
              categoryName: parentChain.categoryName
            });
            selectedTrades.add(parentChain.tradeName);
            break;
        }
      }
      if (node.children) {
        processNode(node.children);
      }
    });
  };

  processNode(categoryTree);
  
  if (!selection.trade && selectedTrades.size > 0) {
    selection.trade = Array.from(selectedTrades)[0];
  }
  
  if (selectedTrades.size > 1) {
    selection.description = `${selection.description ? selection.description + ' | ' : ''}Trades: ${Array.from(selectedTrades).join(', ')}`;
  }

  console.log('📊 Built hierarchical selection:', selection);
  return selection;
};

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
  
  const selection = buildSelection();
  console.log('📦 Built selection object:', selection);
  
  if (!selection.trade && 
      selection.sections.length === 0 && 
      selection.categories.length === 0 && 
      selection.subcategories.length === 0 && 
      selection.types.length === 0) {
    console.error('❌ No categories selected');
    setError('Please select at least one category');
    return;
  }

  if (onComplete) {
    console.log('✅ Calling onComplete callback with selection');
    onComplete(selection); // Pass selection directly
  } else {
    console.error('❌ No onComplete callback provided!');
  }
};

  const clearAll = () => {
    setSelectedItems(new Set());
  };

  // ✅ Add new item based on content type
  const handleAddNewItem = async () => {
    if (!newItemName.trim() || !addingNewItem) return;

    try {
      let result;
      const findNode = (nodes: CategoryNode[], id: string): CategoryNode | null => {
        for (const n of nodes) {
          if (n.id === id) return n;
          if (n.children) {
            const found = findNode(n.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      
      switch (contentType) {
        case 'products':
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
                  if (tradeNode) {
                    const children = await loadChildrenData(tradeNode);
                    updateNodeChildren(tradeNode.id, children);
                  }
                }
              }
              break;
            case 'category':
              if (addingNewItem.parentId) {
                result = await addProductCategory(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const sectionNode = findNode(categoryTree, addingNewItem.parentId);
                  if (sectionNode) {
                    const children = await loadChildrenData(sectionNode);
                    updateNodeChildren(sectionNode.id, children);
                  }
                }
              }
              break;
            case 'subcategory':
              if (addingNewItem.parentId) {
                result = await addProductSubcategory(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const categoryNode = findNode(categoryTree, addingNewItem.parentId);
                  if (categoryNode) {
                    const children = await loadChildrenData(categoryNode);
                    updateNodeChildren(categoryNode.id, children);
                  }
                }
              }
              break;
            case 'type':
              if (addingNewItem.parentId) {
                result = await addProductType(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const subcategoryNode = findNode(categoryTree, addingNewItem.parentId);
                  if (subcategoryNode) {
                    const children = await loadChildrenData(subcategoryNode);
                    updateNodeChildren(subcategoryNode.id, children);
                  }
                }
              }
              break;
          }
          break;

        case 'labor':
          switch (addingNewItem.level) {
            case 'trade':
              result = await addProductTrade(newItemName, userId); // Shared trades
              if (result.success) await loadTrades();
              break;
            case 'section':
              if (addingNewItem.parentId) {
                result = await addLaborSection(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const tradeNode = categoryTree.find(n => n.id === addingNewItem.parentId);
                  if (tradeNode) {
                    const children = await loadChildrenData(tradeNode);
                    updateNodeChildren(tradeNode.id, children);
                  }
                }
              }
              break;
            case 'category':
              if (addingNewItem.parentId) {
                const sectionNode = findNode(categoryTree, addingNewItem.parentId);
                if (sectionNode) {
                  // Find parent trade
                  const tradeNode = categoryTree.find(t => 
                    t.level === 'trade' && findNodeInTree(sectionNode.id, t.children || [])
                  );
                  if (tradeNode) {
                    result = await addLaborCategory(newItemName, sectionNode.id, tradeNode.id, userId);
                    if (result.success) {
                      const children = await loadChildrenData(sectionNode);
                      updateNodeChildren(sectionNode.id, children);
                    }
                  }
                }
              }
              break;
          }
          break;

        case 'tools':
          switch (addingNewItem.level) {
            case 'trade':
              result = await addProductTrade(newItemName, userId); // Shared trades
              if (result.success) await loadTrades();
              break;
            case 'section':
              if (addingNewItem.parentId) {
                result = await addToolSection(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const tradeNode = categoryTree.find(n => n.id === addingNewItem.parentId);
                  if (tradeNode) {
                    const children = await loadChildrenData(tradeNode);
                    updateNodeChildren(tradeNode.id, children);
                  }
                }
              }
              break;
            case 'category':
              if (addingNewItem.parentId) {
                const sectionNode = findNode(categoryTree, addingNewItem.parentId);
                if (sectionNode) {
                  const tradeNode = categoryTree.find(t => 
                    t.level === 'trade' && findNodeInTree(sectionNode.id, t.children || [])
                  );
                  if (tradeNode) {
                    result = await addToolCategory(newItemName, sectionNode.id, tradeNode.id, userId);
                    if (result.success) {
                      const children = await loadChildrenData(sectionNode);
                      updateNodeChildren(sectionNode.id, children);
                    }
                  }
                }
              }
              break;
            case 'subcategory':
              if (addingNewItem.parentId) {
                const categoryNode = findNode(categoryTree, addingNewItem.parentId);
                if (categoryNode && categoryNode.parentId) {
                  const sectionNode = findNode(categoryTree, categoryNode.parentId);
                  if (sectionNode) {
                    const tradeNode = categoryTree.find(t => 
                      t.level === 'trade' && findNodeInTree(sectionNode.id, t.children || [])
                    );
                    if (tradeNode) {
                      result = await addToolSubcategory(newItemName, categoryNode.id, sectionNode.id, tradeNode.id, userId);
                      if (result.success) {
                        const children = await loadChildrenData(categoryNode);
                        updateNodeChildren(categoryNode.id, children);
                      }
                    }
                  }
                }
              }
              break;
          }
          break;

        case 'equipment':
          switch (addingNewItem.level) {
            case 'trade':
              result = await addProductTrade(newItemName, userId); // Shared trades
              if (result.success) await loadTrades();
              break;
            case 'section':
              if (addingNewItem.parentId) {
                result = await addEquipmentSection(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const tradeNode = categoryTree.find(n => n.id === addingNewItem.parentId);
                  if (tradeNode) {
                    const children = await loadChildrenData(tradeNode);
                    updateNodeChildren(tradeNode.id, children);
                  }
                }
              }
              break;
            case 'category':
              if (addingNewItem.parentId) {
                const sectionNode = findNode(categoryTree, addingNewItem.parentId);
                if (sectionNode) {
                  const tradeNode = categoryTree.find(t => 
                    t.level === 'trade' && findNodeInTree(sectionNode.id, t.children || [])
                  );
                  if (tradeNode) {
                    result = await addEquipmentCategory(newItemName, sectionNode.id, tradeNode.id, userId);
                    if (result.success) {
                      const children = await loadChildrenData(sectionNode);
                      updateNodeChildren(sectionNode.id, children);
                    }
                  }
                }
              }
              break;
            case 'subcategory':
              if (addingNewItem.parentId) {
                const categoryNode = findNode(categoryTree, addingNewItem.parentId);
                if (categoryNode && categoryNode.parentId) {
                  const sectionNode = findNode(categoryTree, categoryNode.parentId);
                  if (sectionNode) {
                    const tradeNode = categoryTree.find(t => 
                      t.level === 'trade' && findNodeInTree(sectionNode.id, t.children || [])
                    );
                    if (tradeNode) {
                      result = await addEquipmentSubcategory(newItemName, categoryNode.id, sectionNode.id, tradeNode.id, userId);
                      if (result.success) {
                        const children = await loadChildrenData(categoryNode);
                        updateNodeChildren(categoryNode.id, children);
                      }
                    }
                  }
                }
              }
              break;
          }
          break;
      }

      setAddingNewItem(null);
      setNewItemName('');
    } catch (err) {
      console.error('Error adding new item:', err);
    }
  };

  const renderNode = (node: CategoryNode, depth: number = 0) => {
    const maxLevel = getMaxLevel();
    const canHaveChildren = node.level !== maxLevel;
    const hasChildren = node.children && node.children.length > 0;
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
      return getChildLevel(currentLevel);
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
                  setAddingNewItem({ 
                    level: getNextLevel(node.level), 
                    parentId: node.id,
                    parentName: node.name
                  });
                  setNewItemName('');
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add new {levelLabels[getNextLevel(node.level)].toLowerCase()}</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const counts = getSelectionCounts();
  const hasSelection = selectedItems.size > 0;
  const maxLevel = getMaxLevel();

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <ContentIcon className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">
                    Add {contentLabel} Categories
                  </h3>
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
                <ContentIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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

          {hasSelection && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">
                  <strong>Selected:</strong>
                  {counts.trades > 0 && ` ${counts.trades} Trade${counts.trades > 1 ? 's' : ''}`}
                  {counts.sections > 0 && `, ${counts.sections} Section${counts.sections > 1 ? 's' : ''}`}
                  {counts.categories > 0 && `, ${counts.categories} Categor${counts.categories > 1 ? 'ies' : 'y'}`}
                  {(maxLevel === 'subcategory' || maxLevel === 'type') && counts.subcategories > 0 && `, ${counts.subcategories} Subcategor${counts.subcategories > 1 ? 'ies' : 'y'}`}
                  {maxLevel === 'type' && counts.types > 0 && `, ${counts.types} Type${counts.types > 1 ? 's' : ''}`}
                </div>
                <button
                  onClick={clearAll}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear All
                </button>
              </div>
              
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
