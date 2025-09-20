// src/pages/collections/components/CollectionsScreen.tsx
import React, { useState } from 'react';
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
  GripVertical
} from 'lucide-react';

interface Collection {
  id: number;
  name: string;
  category: string;
}

interface CollectionsScreenProps {
  collection?: Collection;
  onBack: () => void;
}

interface Tool {
  id: number;
  name: string;
  quantity: number;
}

interface Material {
  id: number;
  name: string;
  quantity: number;
  unit: string;
}

interface Step {
  id: number;
  description: string;
  completed: boolean;
}

const CollectionsScreen: React.FC<CollectionsScreenProps> = ({ collection, onBack }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [collectionData, setCollectionData] = useState({
    name: collection?.name || 'New Collection',
    category: collection?.category || 'General',
    estimatedHours: 2.5,
    description: 'Standard procedure for this job type',
    tools: [
      { id: 1, name: 'Adjustable Wrench', quantity: 1 },
      { id: 2, name: 'Level', quantity: 1 },
      { id: 3, name: 'Screwdriver Set', quantity: 1 }
    ] as Tool[],
    materials: [
      { id: 1, name: 'Wax Ring', quantity: 1, unit: 'piece' },
      { id: 2, name: 'Bolts and Hardware', quantity: 1, unit: 'set' },
      { id: 3, name: 'Supply Line', quantity: 1, unit: 'piece' }
    ] as Material[],
    steps: [
      { id: 1, description: 'Remove old fixture', completed: false },
      { id: 2, description: 'Clean and prepare area', completed: false },
      { id: 3, description: 'Install new components', completed: false },
      { id: 4, description: 'Test for leaks', completed: false },
      { id: 5, description: 'Clean up work area', completed: false }
    ] as Step[]
  });

  const handleAddTool = () => {
    const newTool: Tool = {
      id: Date.now(),
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
      id: Date.now(),
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
      id: Date.now(),
      description: 'New step',
      completed: false
    };
    setCollectionData({
      ...collectionData,
      steps: [...collectionData.steps, newStep]
    });
  };

  const handleRemoveTool = (id: number) => {
    setCollectionData({
      ...collectionData,
      tools: collectionData.tools.filter(tool => tool.id !== id)
    });
  };

  const handleRemoveMaterial = (id: number) => {
    setCollectionData({
      ...collectionData,
      materials: collectionData.materials.filter(material => material.id !== id)
    });
  };

  const handleRemoveStep = (id: number) => {
    setCollectionData({
      ...collectionData,
      steps: collectionData.steps.filter(step => step.id !== id)
    });
  };

  const handleSave = () => {
    // Save to Firebase
    console.log('Saving collection:', collectionData);
    setIsEditing(false);
  };

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">No collection selected</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to collections"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            {isEditing ? (
              <input
                type="text"
                value={collectionData.name}
                onChange={(e) => setCollectionData({ ...collectionData, name: e.target.value })}
                className="text-2xl font-bold text-gray-900 border-b-2 border-orange-500 outline-none"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{collectionData.name}</h1>
            )}
            
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
              {collectionData.category}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
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
                <p className="font-semibold">{collectionData.estimatedHours} hours</p>
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
            {collectionData.tools.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  {isEditing && <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />}
                  <Wrench className="w-4 h-4 text-gray-500" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={tool.name}
                      onChange={(e) => {
                        const updatedTools = collectionData.tools.map(t =>
                          t.id === tool.id ? { ...t, name: e.target.value } : t
                        );
                        setCollectionData({ ...collectionData, tools: updatedTools });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <span className="font-medium">{tool.name}</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Qty: {tool.quantity}</span>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveTool(tool.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
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
            {collectionData.materials.map((material) => (
              <div key={material.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  {isEditing && <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />}
                  <Package className="w-4 h-4 text-gray-500" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={material.name}
                      onChange={(e) => {
                        const updatedMaterials = collectionData.materials.map(m =>
                          m.id === material.id ? { ...m, name: e.target.value } : m
                        );
                        setCollectionData({ ...collectionData, materials: updatedMaterials });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <span className="font-medium">{material.name}</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {material.quantity} {material.unit}
                  </span>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveMaterial(material.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
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
            {collectionData.steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm">
                {isEditing && <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />}
                <span className="flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  {index + 1}
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={step.description}
                    onChange={(e) => {
                      const updatedSteps = collectionData.steps.map(s =>
                        s.id === step.id ? { ...s, description: e.target.value } : s
                      );
                      setCollectionData({ ...collectionData, steps: updatedSteps });
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                  />
                ) : (
                  <>
                    <span className="flex-1">{step.description}</span>
                    <CheckCircle className={`w-5 h-5 ${step.completed ? 'text-green-600' : 'text-gray-300'}`} />
                  </>
                )}
                {isEditing && (
                  <button
                    onClick={() => handleRemoveStep(step.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionsScreen;