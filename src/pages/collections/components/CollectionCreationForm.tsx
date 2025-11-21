import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createCollection } from '../../../services/collections';
import { useAuthContext } from '../../../contexts/AuthContext';

const CollectionCreationForm: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimatedHours: ''
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Collection name is required');
      return;
    }
    
    if (!currentUser?.uid) {
      setError('You must be logged in to create a collection');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create empty collection with all content types initialized
      const result = await createCollection({
        name: formData.name.trim(),
        category: 'General', // Default category
        description: formData.description.trim(),
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : 0,
        
        // Initialize empty categorySelection
        categorySelection: {
          trade: '',
          sections: [],
          categories: [],
          subcategories: [],
          types: []
        },
        
        // Initialize empty tabs for all content types
        productCategoryTabs: [],
        laborCategoryTabs: [],
        toolCategoryTabs: [],
        equipmentCategoryTabs: [],
        
        // Initialize empty selections for all content types
        productSelections: {},
        laborSelections: {},
        toolSelections: {},
        equipmentSelections: {},
        
        // Other defaults
        assignedProducts: [],
        taxRate: 0.07,
        userId: currentUser.uid
      });

      if (result.success && result.id) {
        // Navigate to the new collection
        navigate(`/collections/${result.id}`);
      } else {
        setError(result.error || 'Failed to create collection');
      }
    } catch (err) {
      console.error('Error creating collection:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/collections')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Collections
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Collection</h1>
          <p className="text-gray-600 mt-2">
            Create an empty collection and add categories for products, labor, tools, or equipment as needed.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collection Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Bathroom Remodel Package"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={isCreating}
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this collection..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={isCreating}
              />
            </div>

            {/* Estimated Hours */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Hours (Optional)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                placeholder="e.g., 8"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={isCreating}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Info Box */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 After creating your collection, you'll be able to add categories for products, labor, tools, and equipment using the "Add Categories" button.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/collections')}
                disabled={isCreating}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !formData.name.trim()}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Collection'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CollectionCreationForm;