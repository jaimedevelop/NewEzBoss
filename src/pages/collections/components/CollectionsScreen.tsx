// src/pages/collections/components/CollectionsScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Save, 
  Plus, 
  Clock, 
  Package, 
  Wrench,
  CheckCircle,
  X,
  GripVertical,
  AlertCircle
} from 'lucide-react';
import { Collection, Tool, Material, Step, updateCollection } from '../../../services/collections';
import { Alert } from '../../../mainComponents/ui/Alert';

interface CollectionsScreenProps {
  collection?: Collection;
  onBack: () => void;
  onDelete?: () => void;
}

const CollectionsScreen: React.FC<CollectionsScreenProps> = ({ 
  collection, 
  onBack, 
  onDelete 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectionData, setCollectionData] = useState<Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    category: '',
    description: '',
    estimatedHours: 0,
    tools: [],
    materials: [],
    steps: []
  });

  // Update collectionData when collection prop changes
  useEffect(() => {
    if (collection) {
      setCollectionData({
        name: collection.name || '',
        category: collection.category || '',
        description: collection.description || '',
        estimatedHours: collection.estimatedHours || 0,
        tools: collection.tools || [],
        materials: collection.materials || [],
        steps: collection.steps || []
      });
    }
  }, [collection]);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAddTool = () => {
    const newTool: Tool = {
      id: generateId(),
      name: 'New Tool',
      quantity: 1
    };
    setCollectionData({
      ...collectionData,
      tools: [...collectionData.tools, newTool]
    });
  };

  const handleAddMaterial = () => {
    const newMaterial: Material = {
      id: generateId(),
      name: 'New Material',
      quantity: 1,
      unit: 'piece'
    };
    setCollectionData({
      ...collectionData,
      materials: [...collectionData.materials, newMaterial]
    });
  };

  const handleAddStep = () => {
    const newStep: Step = {
      id: generateId(),
      description: 'New step',
      completed: false,
      order: collectionData.steps.length + 1
    };
    setCollectionData({
      ...collectionData,
      steps: [...collectionData.steps, newStep]
    });
  };

  const handleRemoveTool = (id: string) => {
    setCollectionData({
      ...collectionData,
      tools: collectionData.tools.filter(tool => tool.id !== id)
    });
  };

  const handleRemoveMaterial = (id: string) => {
    setCollectionData({
      ...collectionData,
      materials: collectionData.materials.filter(material => material.id !== id)
    });
  };

  const handleRemoveStep = (id: string) => {
    setCollectionData({
      ...collectionData,
      steps: collectionData.steps.filter(step => step.id !== id)
    });
  };

  const handleUpdateTool = (id: string, field: keyof Tool, value: any) => {
    const updatedTools = collectionData.tools.map(tool =>
      tool.id === id ? { ...tool, [field]: value } : tool
    );
    setCollectionData({ ...collectionData, tools: updatedTools });
  };

  const handleUpdateMaterial = (id: string, field: keyof Material, value: any) => {
    const updatedMaterials = collectionData.materials.map(material =>
      material.id === id ? { ...material, [field]: value } : material
    );
    setCollectionData({ ...collectionData, materials: updatedMaterials });
  };

  const handleUpdateStep = (id: string, field: keyof Step, value: any) => {
    const updatedSteps = collectionData.steps.map(step =>
      step.id === id ? { ...step, [field]: value } : step
    );
    setCollectionData({ ...collectionData, steps: updatedSteps });
  };

  const handleSave = async () => {
    if (!collection?.id) {
      setError('Cannot save: Collection ID not found');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await updateCollection(collection.id, collectionData);
      
      if (result.success) {
        setIsEditing(false);
      } else {
        setError(result.error?.message || 'Failed to save collection');
      }
    } catch (err) {
      setError('An unexpected error occurred while saving');
      console.error('Error saving collection:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original data
    if (collection) {
      setCollectionData({
        name: collection.name || '',
        category: collection.category || '',
        description: collection.description || '',
        estimatedHours: collection.estimatedHours || 0,
        tools: collection.tools || [],
        materials: collection.materials || [],
        steps: collection.steps || []
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No collection selected</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white overflow-auto">
      {/* Error Alert */}
      {error && (
        <div className="sticky top-0 z-20 p-4 bg-white border-b border-red-200">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </Alert>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              disabled={isSaving}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Back to collections"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            {isEditing ? (
              <input
                type="text"
                value={collectionData.name}
                onChange={(e) => setCollectionData({ ...collectionData, name: e.target.value })}
                className="text-2xl font-bold text-gray-900 border-b-2 border-orange-500 outline-none bg-transparent"
                placeholder="Collection name"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{collectionData.name}</h1>
            )}
            
            {isEditing ? (
              <input
                type="text"
                value={collectionData.category}
                onChange={(e) => setCollectionData({ ...collectionData, category: e.target.value })}
                className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium border border-orange-200 outline-none"
                placeholder="Category"
              />
            ) : (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                {collectionData.category}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Cancel editing"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                {onDelete && (
                  <button 
                    onClick={onDelete}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete collection"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {isEditing ? (
          <div className="mt-4">
            <textarea
              value={collectionData.description}
              onChange={(e) => setCollectionData({ ...collectionData, description: e.target.value })}
              placeholder="Collection description"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none outline-none focus:border-orange-500"
              rows={2}
            />
          </div>
        ) : (
          collectionData.description && (
            <p className="mt-2 text-gray-600">{collectionData.description}</p>
          )
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Overview Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Estimated Time</p>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.1"
                    value={collectionData.estimatedHours}
                    onChange={(e) => setCollectionData({ ...collectionData, estimatedHours: parseFloat(e.target.value) || 0 })}
                    className="font-semibold bg-white border border-gray-300 rounded px-2 py-1 w-20"
                  />
                ) : (
                  <p className="font-semibold">{collectionData.estimatedHours} hours</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Wrench className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Tools Required</p>
                <p className="font-semibold">{collectionData.tools.length} items</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Package className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Materials Needed</p>
                <p className="font-semibold">{collectionData.materials.length} items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Required Tools</h2>
            {isEditing && (
              <button
                onClick={handleAddTool}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Tool</span>
              </button>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {collectionData.tools.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                {isEditing ? 'Click "Add Tool" to get started' : 'No tools required'}
              </div>
            ) : (
              collectionData.tools.map((tool) => (
                <div key={tool.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <div className="flex items-center space-x-3 flex-1">
                    {isEditing && <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />}
                    <Wrench className="w-4 h-4 text-gray-500" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={tool.name}
                        onChange={(e) => handleUpdateTool(tool.id, 'name', e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                        placeholder="Tool name"
                      />
                    ) : (
                      <span className="font-medium flex-1">{tool.name}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        value={tool.quantity}
                        onChange={(e) => handleUpdateTool(tool.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                    ) : (
                      <span className="text-sm text-gray-500">Qty: {tool.quantity}</span>
                    )}
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveTool(tool.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Remove tool"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Materials Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Required Materials</h2>
            {isEditing && (
              <button
                onClick={handleAddMaterial}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Material</span>
              </button>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {collectionData.materials.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                {isEditing ? 'Click "Add Material" to get started' : 'No materials required'}
              </div>
            ) : (
              collectionData.materials.map((material) => (
                <div key={material.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <div className="flex items-center space-x-3 flex-1">
                    {isEditing && <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />}
                    <Package className="w-4 h-4 text-gray-500" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={material.name}
                        onChange={(e) => handleUpdateMaterial(material.id, 'name', e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                        placeholder="Material name"
                      />
                    ) : (
                      <span className="font-medium flex-1">{material.name}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="1"
                          value={material.quantity}
                          onChange={(e) => handleUpdateMaterial(material.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                        <input
                          type="text"
                          value={material.unit}
                          onChange={(e) => handleUpdateMaterial(material.id, 'unit', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                          placeholder="unit"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {material.quantity} {material.unit}
                      </span>
                    )}
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveMaterial(material.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Remove material"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Steps Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Procedure Steps</h2>
            {isEditing && (
              <button
                onClick={handleAddStep}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Step</span>
              </button>
            )}
          </div>
          <div className="space-y-2">
            {collectionData.steps.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
                {isEditing ? 'Click "Add Step" to create procedure steps' : 'No procedure steps defined'}
              </div>
            ) : (
              collectionData.steps
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm">
                    {isEditing && <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />}
                    <span className="flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-700 rounded-full text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={step.description}
                        onChange={(e) => handleUpdateStep(step.id, 'description', e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                        placeholder="Step description"
                      />
                    ) : (
                      <>
                        <span className="flex-1">{step.description}</span>
                        <CheckCircle 
                          className={`w-5 h-5 flex-shrink-0 ${step.completed ? 'text-green-600' : 'text-gray-300'}`} 
                        />
                      </>
                    )}
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveStep(step.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                        title="Remove step"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionsScreen;