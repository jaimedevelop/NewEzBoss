import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, Edit2, Trash2, Save, XCircle, Search, Plus, Check } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { getProductTrades, type ProductTrade } from '../../services/categories/trades';

// Generic interfaces for type safety
interface GenericSection {
  id?: string;
  name: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

interface GenericCategory {
  id?: string;
  name: string;
  sectionId: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

interface GenericSubcategory {
  id?: string;
  name: string;
  categoryId: string;
  sectionId: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

interface GenericResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Service functions interface
interface HierarchyServices {
  getSections: (tradeId: string, userId: string) => Promise<GenericResponse<GenericSection[]>>;
  addSection: (name: string, tradeId: string, userId: string) => Promise<GenericResponse<string>>;
  getCategories: (sectionId: string, userId: string) => Promise<GenericResponse<GenericCategory[]>>;
  addCategory: (name: string, sectionId: string, tradeId: string, userId: string) => Promise<GenericResponse<string>>;
  getSubcategories?: (categoryId: string, userId: string) => Promise<GenericResponse<GenericSubcategory[]>>;
  addSubcategory?: (name: string, categoryId: string, sectionId: string, tradeId: string, userId: string) => Promise<GenericResponse<string>>;
}

// Hierarchy node interface
interface HierarchyNode {
  id: string;
  name: string;
  level: 'trade' | 'section' | 'category' | 'subcategory';
  parentId: string | null;
  tradeId?: string;
  sectionId?: string;
  categoryId?: string;
  children: HierarchyNode[];
}

// Component props
interface GenericCategoryEditorProps {
  moduleName: 'Labor' | 'Tools' | 'Equipment';
  moduleColor: 'purple' | 'blue' | 'green';
  levels: ('trade' | 'section' | 'category' | 'subcategory')[];
  services: HierarchyServices;
  isOpen: boolean;
  onClose: () => void;
  onCategoryUpdated: () => void;
}

const GenericCategoryEditor: React.FC<GenericCategoryEditorProps> = ({
  moduleName,
  moduleColor,
  levels,
  services,
  isOpen,
  onClose,
  onCategoryUpdated
}) => {
  const { currentUser } = useAuthContext();
  const [hierarchyTree, setHierarchyTree] = useState<HierarchyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create category inline state
  const [creatingNode, setCreatingNode] = useState<{ 
    level: 'trade' | 'section' | 'category' | 'subcategory'; 
    parentId: string | null;
    tradeId?: string;
    sectionId?: string;
    categoryId?: string;
  } | null>(null);
  const [createValue, setCreateValue] = useState('');
  const [createError, setCreateError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load hierarchy on open
  useEffect(() => {
    if (isOpen && currentUser?.uid) {
      loadHierarchy();
    }
  }, [isOpen, currentUser?.uid]);

  const loadHierarchy = async () => {
    if (!currentUser?.uid) return;
    
    setLoading(true);
    try {
      // Load trades first (shared)
      const tradesResult = await getProductTrades(currentUser.uid);
      if (!tradesResult.success || !tradesResult.data) {
        setLoading(false);
        return;
      }

      // Build hierarchy tree
      const tree: HierarchyNode[] = [];

      for (const trade of tradesResult.data) {
        const tradeNode: HierarchyNode = {
          id: trade.id!,
          name: trade.name,
          level: 'trade',
          parentId: null,
          children: []
        };

        // Load sections for this trade
        const sectionsResult = await services.getSections(trade.id!, currentUser.uid);
        if (sectionsResult.success && sectionsResult.data) {
          for (const section of sectionsResult.data) {
            const sectionNode: HierarchyNode = {
              id: section.id!,
              name: section.name,
              level: 'section',
              parentId: trade.id!,
              tradeId: trade.id!,
              children: []
            };

            // Load categories for this section
            const categoriesResult = await services.getCategories(section.id!, currentUser.uid);
            if (categoriesResult.success && categoriesResult.data) {
              for (const category of categoriesResult.data) {
                const categoryNode: HierarchyNode = {
                  id: category.id!,
                  name: category.name,
                  level: 'category',
                  parentId: section.id!,
                  tradeId: trade.id!,
                  sectionId: section.id!,
                  children: []
                };

                // Load subcategories if supported (4-level hierarchy)
                if (levels.includes('subcategory') && services.getSubcategories) {
                  const subcategoriesResult = await services.getSubcategories(category.id!, currentUser.uid);
                  if (subcategoriesResult.success && subcategoriesResult.data) {
                    for (const subcategory of subcategoriesResult.data) {
                      const subcategoryNode: HierarchyNode = {
                        id: subcategory.id!,
                        name: subcategory.name,
                        level: 'subcategory',
                        parentId: category.id!,
                        tradeId: trade.id!,
                        sectionId: section.id!,
                        categoryId: category.id!,
                        children: []
                      };
                      categoryNode.children.push(subcategoryNode);
                    }
                  }
                }

                sectionNode.children.push(categoryNode);
              }
            }

            tradeNode.children.push(sectionNode);
          }
        }

        tree.push(tradeNode);
      }

      setHierarchyTree(tree);
    } catch (error) {
      console.error('Error loading hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChildLevel = (level: string): 'trade' | 'section' | 'category' | 'subcategory' => {
    const hierarchy: Record<string, 'trade' | 'section' | 'category' | 'subcategory'> = {
      'trade': 'section',
      'section': 'category',
      'category': 'subcategory'
    };
    return hierarchy[level] || 'trade';
  };

  const startCreate = (
    level: 'trade' | 'section' | 'category' | 'subcategory', 
    parentId: string | null = null,
    tradeId?: string,
    sectionId?: string,
    categoryId?: string
  ) => {
    setCreatingNode({ level, parentId, tradeId, sectionId, categoryId });
    setCreateValue('');
    setCreateError('');
  };

  const cancelCreate = () => {
    setCreatingNode(null);
    setCreateValue('');
    setCreateError('');
  };

  const saveCreate = async () => {
    if (!currentUser?.uid || !creatingNode || isSaving) return;

    const trimmedValue = createValue.trim();
    
    if (!trimmedValue) {
      setCreateError('Name cannot be empty');
      return;
    }

    if (trimmedValue.length > 30) {
      setCreateError('Name must be 30 characters or less');
      return;
    }

    setIsSaving(true);
    try {
      let result: GenericResponse<string>;

      // Call appropriate service based on level
      switch (creatingNode.level) {
        case 'section':
          if (!creatingNode.tradeId) {
            setCreateError('Trade ID is required');
            setIsSaving(false);
            return;
          }
          result = await services.addSection(
            trimmedValue,
            creatingNode.tradeId,
            currentUser.uid
          );
          break;

        case 'category':
          if (!creatingNode.sectionId || !creatingNode.tradeId) {
            setCreateError('Section and Trade IDs are required');
            setIsSaving(false);
            return;
          }
          result = await services.addCategory(
            trimmedValue,
            creatingNode.sectionId,
            creatingNode.tradeId,
            currentUser.uid
          );
          break;

        case 'subcategory':
          if (!services.addSubcategory) {
            setCreateError('Subcategories not supported for this module');
            setIsSaving(false);
            return;
          }
          if (!creatingNode.categoryId || !creatingNode.sectionId || !creatingNode.tradeId) {
            setCreateError('Category, Section, and Trade IDs are required');
            setIsSaving(false);
            return;
          }
          result = await services.addSubcategory(
            trimmedValue,
            creatingNode.categoryId,
            creatingNode.sectionId,
            creatingNode.tradeId,
            currentUser.uid
          );
          break;

        default:
          setCreateError('Invalid level');
          setIsSaving(false);
          return;
      }

      if (result.success) {
        // Reload hierarchy and notify parent
        await loadHierarchy();
        onCategoryUpdated();
        cancelCreate();
        
        // If the created category was a child, auto-expand the parent
        if (creatingNode.parentId) {
          setExpandedNodes(prev => new Set([...prev, creatingNode.parentId!]));
        }
      } else {
        setCreateError(result.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setCreateError('An error occurred while creating the category');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getLevelColor = (level: string) => {
    const colors = {
      trade: 'text-blue-600 bg-blue-50',
      section: 'text-green-600 bg-green-50',
      category: 'text-purple-600 bg-purple-50',
      subcategory: 'text-orange-600 bg-orange-50'
    };
    return colors[level as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const getModuleColorClass = (variant: 'text' | 'bg' | 'border' | 'ring' | 'hover-bg' | 'hover-text') => {
    const colorMap = {
      purple: {
        text: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-400',
        ring: 'ring-purple-500',
        'hover-bg': 'hover:bg-purple-50',
        'hover-text': 'hover:text-purple-600'
      },
      blue: {
        text: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-400',
        ring: 'ring-blue-500',
        'hover-bg': 'hover:bg-blue-50',
        'hover-text': 'hover:text-blue-600'
      },
      green: {
        text: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-400',
        ring: 'ring-green-500',
        'hover-bg': 'hover:bg-green-50',
        'hover-text': 'hover:text-green-600'
      }
    };
    return colorMap[moduleColor][variant];
  };

  const renderCreateItem = (
    level: 'trade' | 'section' | 'category' | 'subcategory', 
    parentId: string | null, 
    depth: number,
    tradeId?: string,
    sectionId?: string,
    categoryId?: string
  ) => {
    const capitalizedLevel = level.charAt(0).toUpperCase() + level.slice(1);
    const isCreating = 
      creatingNode?.level === level && 
      creatingNode?.parentId === parentId &&
      creatingNode?.tradeId === tradeId &&
      creatingNode?.sectionId === sectionId &&
      creatingNode?.categoryId === categoryId;
    
    if (isCreating) {
      // Show inline input form
      return (
        <div
          key={`create-${level}-${parentId || 'root'}-${tradeId}-${sectionId}-${categoryId}`}
          className={`flex items-center gap-2 py-2 px-3 border-2 border-dashed rounded-lg ${getModuleColorClass('border')} ${getModuleColorClass('bg')}`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="w-4" /> {/* Spacer for alignment */}
          
          <span className={`text-xs px-2 py-1 rounded font-medium ${getLevelColor(level)}`}>
            {level}
          </span>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={createValue}
              onChange={(e) => {
                setCreateValue(e.target.value);
                setCreateError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveCreate();
                if (e.key === 'Escape') cancelCreate();
              }}
              placeholder={`Enter ${level} name...`}
              maxLength={30}
              className={`flex-1 px-2 py-1 border rounded focus:ring-2 focus:border-transparent text-sm ${getModuleColorClass('border')} ${getModuleColorClass('ring')}`}
              autoFocus
              disabled={isSaving}
            />
            
            <div className="flex items-center gap-1">
              {createError ? (
                <span className="text-xs text-red-600 mr-2">{createError}</span>
              ) : isSaving ? (
                <span className="text-xs text-gray-500">Saving...</span>
              ) : (
                <span className="text-xs text-gray-500">{createValue.length}/30</span>
              )}
              
              <button
                onClick={saveCreate}
                disabled={!createValue.trim() || isSaving}
                className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-100 disabled:text-gray-400 disabled:hover:bg-transparent"
                title="Save"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={cancelCreate}
                disabled={isSaving}
                className="text-gray-600 hover:text-gray-700 p-1 rounded hover:bg-gray-100 disabled:text-gray-400"
                title="Cancel"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // Show create button
    return (
      <div
        key={`create-${level}-${parentId || 'root'}-${tradeId}-${sectionId}-${categoryId}`}
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer group border-2 border-dashed border-gray-300 transition-colors ${getModuleColorClass('hover-bg')} ${getModuleColorClass('border')}`}
        style={{ marginLeft: `${depth * 24}px` }}
        onClick={() => startCreate(level, parentId, tradeId, sectionId, categoryId)}
      >
        <Plus className={`h-4 w-4 text-gray-400 ${getModuleColorClass('hover-text')}`} />
        <span className={`flex-1 font-medium text-gray-600 ${getModuleColorClass('hover-text')}`}>
          Create {capitalizedLevel}
        </span>
      </div>
    );
  };

  const renderNode = (node: HierarchyNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const canHaveChildren = node.level !== levels[levels.length - 1]; // Last level can't have children

    // Filter based on search
    if (searchTerm && !node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      // Check if any children match
      const childrenMatch = node.children.some(child => 
        child.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (!childrenMatch) return null;
    }

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg group"
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {/* Expand/Collapse Button */}
          {canHaveChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Level Badge */}
          <span className={`text-xs px-2 py-1 rounded font-medium ${getLevelColor(node.level)}`}>
            {node.level}
          </span>

          {/* Name */}
          <span className="flex-1 font-medium text-gray-800">{node.name}</span>
        </div>

        {/* Render Children Section */}
        {canHaveChildren && isExpanded && (
          <div>
            {/* Add create item for child level as first item */}
            {renderCreateItem(
              getChildLevel(node.level), 
              node.id, 
              depth + 1,
              node.level === 'trade' ? node.id : node.tradeId,
              node.level === 'section' ? node.id : node.sectionId,
              node.level === 'category' ? node.id : node.categoryId
            )}
            {/* Render existing children */}
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Manage {moduleName} Categories
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent ${getModuleColorClass('ring')}`}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading categories...</div>
            </div>
          ) : (
            <div className="space-y-1">
              {hierarchyTree.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No categories yet. Trades are shared across all modules.
                  <br />
                  Go to Inventory → Products → Manage Categories to add trades.
                </div>
              ) : (
                hierarchyTree.map(node => renderNode(node, 0))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{moduleName}</span> uses {levels.length}-level hierarchy: {levels.join(' → ')}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenericCategoryEditor;