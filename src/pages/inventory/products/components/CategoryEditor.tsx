import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronDown, Edit2, Trash2, Save, XCircle, Search, Plus, Check } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
  getFullCategoryHierarchy,
  createCategory,
  updateCategoryName,
  deleteCategoryWithChildren,
  getCategoryUsageStats
} from '../../../../services/categories';
import { type CategoryNode } from '../../../../services/categories/types'
import DeleteConfirmationModal from '../../../../mainComponents/hierarchy/DeleteConfirmationModal';

interface CategoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryUpdated: () => void;
}

const CategoryEditor: React.FC<CategoryEditorProps> = ({
  isOpen,
  onClose,
  onCategoryUpdated
}) => {
  const { currentUser } = useAuthContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create category inline state
  const [creatingNode, setCreatingNode] = useState<{ level: string; parentId: string | null } | null>(null);
  const [createValue, setCreateValue] = useState('');
  const [createError, setCreateError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    categoryId: string;
    categoryName: string;
    level: 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size';
    categoryCount: number;
    productCount: number;
  }>({
    isOpen: false,
    categoryId: '',
    categoryName: '',
    level: 'trade',
    categoryCount: 0,
    productCount: 0
  });

  useEffect(() => {
    if (isOpen && currentUser?.uid) {
      loadCategories();
    }
  }, [isOpen, currentUser?.uid]);

  const loadCategories = async () => {
    if (!currentUser?.uid) return;
    
    setLoading(true);
    try {
      const result = await getFullCategoryHierarchy(currentUser.uid);
      
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChildLevel = (level: string): 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size' => {
    const hierarchy: Record<string, 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size'> = {
      'trade': 'section',
      'section': 'category',
      'category': 'subcategory',
      'subcategory': 'type',
      'type': 'size'
    };
    return hierarchy[level] || 'trade';
  };

  const startCreate = (level: 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size', parentId: string | null = null) => {
    setCreatingNode({ level, parentId });
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
    const result = await createCategory(
      trimmedValue,
      creatingNode.level as 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size',
      creatingNode.parentId,
      currentUser.uid
    );

  if (result.success) {
    // Save scroll position
    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;
    
    // Reload categories and notify parent
    await loadCategories();
    onCategoryUpdated();
    
    // Restore scroll position after React re-renders
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollPosition;
      }
    }, 0);
    
    // Clear input but keep form open for adding more
    setCreateValue('');
    setCreateError('');
    
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

  const startEdit = (node: CategoryNode) => {
    setEditingNode(node.id);
    setEditValue(node.name);
  };

  const cancelEdit = () => {
    setEditingNode(null);
    setEditValue('');
  };

  const saveEdit = async (node: CategoryNode) => {
    if (!currentUser?.uid || !editValue.trim()) {
      cancelEdit();
      return;
    }

    const newName = editValue.trim();

    try {
      const result = await updateCategoryName(
        node.id,
        newName,
        node.level,
        currentUser.uid
      );

      if (result.success) {
        await loadCategories();
        onCategoryUpdated();
        cancelEdit();
      } else {
        alert(result.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('An error occurred while updating the category');
    }
  };

  const initiateDelete = async (node: CategoryNode) => {
    if (!currentUser?.uid) return;

    try {
      // Get usage stats
      const statsResult = await getCategoryUsageStats(
        node.id,
        node.level,
        currentUser.uid
      );

      if (statsResult.success && statsResult.data) {
        setDeleteModal({
          isOpen: true,
          categoryId: node.id,
          categoryName: node.name,
          level: node.level,
          categoryCount: statsResult.data.categoryCount,
          productCount: statsResult.data.productCount
        });
      }
    } catch (error) {
      console.error('Error getting category stats:', error);
      alert('An error occurred while preparing to delete the category');
    }
  };

  const confirmDelete = async () => {
    if (!currentUser?.uid) return;

    try {
      const result = await deleteCategoryWithChildren(
        deleteModal.categoryId,
        deleteModal.level,
        currentUser.uid
      );

      if (result.success) {
        await loadCategories();
        onCategoryUpdated();
        setDeleteModal({ ...deleteModal, isOpen: false });
      } else {
        alert(result.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('An error occurred while deleting the category');
    }
  };

  const getLevelColor = (level: string) => {
    const colors = {
      trade: 'text-blue-600 bg-blue-50',
      section: 'text-green-600 bg-green-50',
      category: 'text-purple-600 bg-purple-50',
      subcategory: 'text-orange-600 bg-orange-50',
      type: 'text-pink-600 bg-pink-50',
      size: 'text-teal-600 bg-teal-50'
    };
    return colors[level as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const renderCreateItem = (level: 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size', parentId: string | null, depth: number) => {
    const capitalizedLevel = level.charAt(0).toUpperCase() + level.slice(1);
    const isCreating = creatingNode?.level === level && creatingNode?.parentId === parentId;
    
    if (isCreating) {
      // Show inline input form
      return (
        <div
          key={`create-${level}-${parentId || 'root'}`}
          className="flex items-center gap-2 py-2 px-3 border-2 border-dashed border-orange-400 bg-orange-50 rounded-lg"
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
              className="flex-1 px-2 py-1 border border-orange-500 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
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
        key={`create-${level}-${parentId || 'root'}`}
        className="flex items-center gap-2 py-2 px-3 hover:bg-orange-50 rounded-lg cursor-pointer group border-2 border-dashed border-gray-300 hover:border-orange-400 transition-colors"
        style={{ marginLeft: `${depth * 24}px` }}
        onClick={() => startCreate(level, parentId)}
      >
        <Plus className="h-4 w-4 text-gray-400 group-hover:text-orange-600" />
        <span className="flex-1 font-medium text-gray-600 group-hover:text-orange-600">
          Create {capitalizedLevel}
        </span>
      </div>
    );
  };

  const renderNode = (node: CategoryNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isEditing = editingNode === node.id;
    const canHaveChildren = node.level !== 'size'; // Sizes can't have children

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
          {/* Expand/Collapse Button - Show for all nodes that can have children */}
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

          {/* Name (Editable) */}
          {isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(node);
                  if (e.key === 'Escape') cancelEdit();
                }}
                className="flex-1 px-2 py-1 border border-orange-500 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={() => saveEdit(node)}
                className="text-green-600 hover:text-green-700 p-1"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={cancelEdit}
                className="text-gray-600 hover:text-gray-700 p-1"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <span className="flex-1 font-medium text-gray-800">{node.name}</span>
              
              {/* Action Buttons (shown on hover) */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                <button
                  onClick={() => startEdit(node)}
                  className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => initiateDelete(node)}
                  className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Render Children Section - Show when expanded, even if no children yet */}
        {canHaveChildren && isExpanded && (
          <div>
            {/* Add create item for child level as first item */}
            {renderCreateItem(getChildLevel(node.level), node.id, depth + 1)}
            {/* Render existing children */}
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
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
            <h2 className="text-2xl font-bold text-gray-900">Manage Categories</h2>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading categories...</div>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Always show "Create Trade" at the top */}
                {renderCreateItem('trade', null, 0)}
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No categories yet. Click "Create Trade" above to get started.
                  </div>
                ) : (
                  categories.map(node => renderNode(node, 0))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Click <Edit2 className="h-3 w-3 inline" /> to edit or <Trash2 className="h-3 w-3 inline" /> to delete
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDelete}
        categoryName={deleteModal.categoryName}
        categoryCount={deleteModal.categoryCount}
        productCount={deleteModal.productCount}
      />
    </>
  );
};

export default CategoryEditor;