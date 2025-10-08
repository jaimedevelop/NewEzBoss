import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, Edit2, Trash2, Save, XCircle, Search, Plus } from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext';
import {
  getFullCategoryHierarchy,
  updateCategoryName,
  deleteCategoryWithChildren,
  getCategoryUsageStats,
  type CategoryNode
} from '../../../services/productCategories';
import DeleteConfirmationModal from './DeleteConfirmationModal';

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
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create category modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  
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
      console.log('📂 CategoryEditor opened, loading categories for user:', currentUser.uid);
      loadCategories();
    }
  }, [isOpen, currentUser?.uid]);

  const loadCategories = async () => {
    if (!currentUser?.uid) return;
    
    console.log('🔄 Loading categories...');
    setLoading(true);
    try {
      const result = await getFullCategoryHierarchy(currentUser.uid);
      console.log('✅ Categories loaded:', {
        success: result.success,
        categoryCount: result.data?.length || 0,
        categories: result.data
      });
      
      if (result.success && result.data) {
        setCategories(result.data);
        console.log('📊 Category tree structure:', JSON.stringify(result.data, null, 2));
      } else {
        console.error('❌ Failed to load categories:', result.error);
      }
    } catch (error) {
      console.error('💥 Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
      console.log('➖ Collapsed node:', nodeId);
    } else {
      newExpanded.add(nodeId);
      console.log('➕ Expanded node:', nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const startEdit = (node: CategoryNode) => {
    console.log('✏️ Started editing category:', {
      id: node.id,
      name: node.name,
      level: node.level
    });
    setEditingNode(node.id);
    setEditValue(node.name);
  };

  const cancelEdit = () => {
    console.log('❌ Cancelled edit for node:', editingNode);
    setEditingNode(null);
    setEditValue('');
  };

  const saveEdit = async (node: CategoryNode) => {
    if (!currentUser?.uid || !editValue.trim()) {
      console.log('⚠️ Edit cancelled - no user or empty value');
      cancelEdit();
      return;
    }

    const oldName = node.name;
    const newName = editValue.trim();
    
    console.log('💾 Saving category edit:', {
      categoryId: node.id,
      level: node.level,
      oldName: oldName,
      newName: newName,
      userId: currentUser.uid
    });

    try {
      const result = await updateCategoryName(
        node.id,
        newName,
        node.level,
        currentUser.uid
      );

      console.log('📝 Update category result:', {
        success: result.success,
        error: result.error,
        categoryId: node.id,
        newName: newName
      });

      if (result.success) {
        console.log('✅ Category updated successfully, reloading categories...');
        await loadCategories();
        console.log('📢 Notifying parent component of update...');
        onCategoryUpdated();
        cancelEdit();
        console.log('🎉 Category edit complete!');
      } else {
        console.error('❌ Failed to update category:', result.error);
        alert(result.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('💥 Exception while updating category:', error);
      alert('An error occurred while updating the category');
    }
  };

  const initiateDelete = async (node: CategoryNode) => {
    if (!currentUser?.uid) return;

    console.log('🗑️ Initiating delete for category:', {
      id: node.id,
      name: node.name,
      level: node.level
    });

    try {
      // Get usage stats
      const statsResult = await getCategoryUsageStats(
        node.id,
        node.level,
        currentUser.uid
      );

      console.log('📊 Category usage stats:', {
        success: statsResult.success,
        categoryCount: statsResult.data?.categoryCount,
        productCount: statsResult.data?.productCount
      });

      if (statsResult.success && statsResult.data) {
        setDeleteModal({
          isOpen: true,
          categoryId: node.id,
          categoryName: node.name,
          level: node.level,
          categoryCount: statsResult.data.categoryCount,
          productCount: statsResult.data.productCount
        });
        console.log('🔔 Delete confirmation modal opened');
      }
    } catch (error) {
      console.error('💥 Error getting category stats:', error);
      alert('An error occurred while preparing to delete the category');
    }
  };

  const confirmDelete = async () => {
    if (!currentUser?.uid) return;

    console.log('⚠️ Delete confirmed for category:', {
      categoryId: deleteModal.categoryId,
      categoryName: deleteModal.categoryName,
      level: deleteModal.level,
      categoryCount: deleteModal.categoryCount,
      productCount: deleteModal.productCount
    });

    try {
      const result = await deleteCategoryWithChildren(
        deleteModal.categoryId,
        deleteModal.level,
        currentUser.uid
      );

      console.log('🗑️ Delete category result:', {
        success: result.success,
        error: result.error,
        categoryId: deleteModal.categoryId
      });

      if (result.success) {
        console.log('✅ Category deleted successfully, reloading categories...');
        await loadCategories();
        console.log('📢 Notifying parent component of deletion...');
        onCategoryUpdated();
        setDeleteModal({ ...deleteModal, isOpen: false });
        console.log('🎉 Category deletion complete!');
      } else {
        console.error('❌ Failed to delete category:', result.error);
        alert(result.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('💥 Exception while deleting category:', error);
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

  const renderNode = (node: CategoryNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isEditing = editingNode === node.id;

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
          {hasChildren && (
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
          )}
          {!hasChildren && <div className="w-4" />}

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

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>
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
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Manage Categories</h2>
              <button
                onClick={() => {
                  console.log('➕ Create category button clicked');
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                Create Category
              </button>
            </div>
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  console.log('🔍 Search term:', e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading categories...</div>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No categories found. Create categories from the product management page.
              </div>
            ) : (
              <div className="space-y-1">
                {categories.map(node => renderNode(node, 0))}
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

      {/* Create Category Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50" 
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Category</h3>
            <p className="text-gray-600 mb-4">
              Category creation form will go here. This should include:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
              <li>Select level (trade, section, category, etc.)</li>
              <li>Select parent category (if not trade level)</li>
              <li>Enter category name</li>
              <li>Optional description</li>
            </ul>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('✅ Create category confirmed (form not yet implemented)');
                  setShowCreateModal(false);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          console.log('❌ Delete cancelled');
          setDeleteModal({ ...deleteModal, isOpen: false });
        }}
        onConfirm={confirmDelete}
        categoryName={deleteModal.categoryName}
        categoryCount={deleteModal.categoryCount}
        productCount={deleteModal.productCount}
      />
    </>
  );
};

export default CategoryEditor;