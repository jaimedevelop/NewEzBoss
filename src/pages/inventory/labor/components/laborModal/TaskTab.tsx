// src/pages/labor/components/creationModal/TaskTab.tsx
import React, { useState } from 'react';
import { 
  DndContext, 
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus, ClipboardList, CheckCircle, Upload } from 'lucide-react';
import { useLaborCreation } from '../../../../../contexts/LaborCreationContext';
import type { TaskEntry } from '../../../../../services/inventory/labor/labor.types';
import { BulkTaskImporter } from './BulkTaskImporter';
import { DraggableTaskItem } from './DraggableTaskItem';

interface TaskTabProps {
  disabled?: boolean;
}

const TaskTab: React.FC<TaskTabProps> = ({ disabled = false }) => {
  const { 
    state, 
    updateTaskEntry, 
    addTaskEntry, 
    removeTaskEntry,
    setFormData
  } = useLaborCreation();
  
  const { formData } = state;
  const [showBulkImporter, setShowBulkImporter] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement before drag starts (prevents accidental drags)
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = formData.tasks.findIndex(t => t.id === active.id);
      const newIndex = formData.tasks.findIndex(t => t.id === over.id);
      
      const reorderedTasks = arrayMove(formData.tasks, oldIndex, newIndex);
      
      setFormData({
        ...formData,
        tasks: reorderedTasks
      });
    }
    
    setActiveId(null);
  };

  const handleBulkImport = (tasks: Array<{ name: string; description: string }>) => {
    // Create new task entries with data
    const newTasks = tasks.map(task => ({
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: task.name,
      description: task.description
    }));
    
    // Add all tasks at once by updating form data
    setFormData({
      ...formData,
      tasks: [...formData.tasks, ...newTasks]
    });
    
    setShowBulkImporter(false);
  };

  // Calculate task completion stats (for display purposes)
  const taskStats = React.useMemo(() => {
    if (!formData.tasks || formData.tasks.length === 0) {
      return { total: 0, completed: 0, withDescription: 0 };
    }

    const completed = formData.tasks.filter(t => t.name && t.name.trim()).length;
    const withDescription = formData.tasks.filter(t => t.name && t.description).length;

    return {
      total: formData.tasks.length,
      completed,
      withDescription
    };
  }, [formData.tasks]);

  // Get the active task for the drag overlay
  const activeTask = activeId ? formData.tasks.find(t => t.id === activeId) : null;
  const activeIndex = activeTask ? formData.tasks.findIndex(t => t.id === activeId) : -1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Task Checklist</h3>
          <p className="text-sm text-gray-500 mt-1">
            Create a step-by-step guide for completing this labor task
          </p>
        </div>
        {!disabled && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowBulkImporter(true)}
              className="inline-flex items-center px-3 py-2 border border-orange-300 shadow-sm text-sm font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Multiple Tasks
            </button>
            <button
              type="button"
              onClick={addTaskEntry}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Single Task
            </button>
          </div>
        )}
      </div>

      {/* Task Statistics */}
      {formData.tasks && formData.tasks.length > 0 && (
        <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <ClipboardList className="w-4 h-4 text-blue-600 mr-1" />
              <span className="text-gray-600">
                <span className="font-medium text-blue-600">{taskStats.total}</span> total tasks
              </span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-gray-600">
                <span className="font-medium text-green-600">{taskStats.completed}</span> with names
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-600">
                <span className="font-medium text-orange-600">{taskStats.withDescription}</span> with descriptions
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Drag-and-Drop Task Entries */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        autoScroll={{
          threshold: { x: 0, y: 0.2 }, // Start scrolling at 20% from edge
          acceleration: 10,
          interval: 5,
        }}
      >
        <SortableContext 
          items={formData.tasks.map(t => t.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {formData.tasks && formData.tasks.map((task, index) => (
              <DraggableTaskItem
                key={task.id}
                task={task}
                index={index}
                disabled={disabled}
                onUpdate={updateTaskEntry}
                onRemove={removeTaskEntry}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag Overlay - Shows dragged item while dragging */}
        <DragOverlay>
          {activeTask && (
            <div className="flex items-center space-x-3 p-4 border-2 border-orange-400 rounded-lg bg-orange-50 shadow-2xl">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white font-bold text-xl shadow-md">
                {activeIndex + 1}
              </div>
              <div className="flex-1 font-medium text-gray-900">
                {activeTask.name || 'Untitled Task'}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {(!formData.tasks || formData.tasks.length === 0) && (
        <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          <ClipboardList className="w-16 h-16 mx-auto mb-3 text-gray-300" />
          <div className="text-base font-medium">No tasks added yet</div>
          <div className="text-sm mt-1 mb-4">
            Break down this labor task into clear, actionable steps
          </div>
          {!disabled && (
            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => setShowBulkImporter(true)}
                className="inline-flex items-center px-4 py-2 border border-orange-300 shadow-sm text-sm font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import from AI
              </button>
              <span className="text-gray-400">or</span>
              <button
                type="button"
                onClick={addTaskEntry}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tips Section */}
      {formData.tasks && formData.tasks.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
          <h4 className="text-sm font-semibold text-orange-900 mb-3 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Tips for Better Task Descriptions
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs text-orange-800">
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">✓</span>
              <span><strong>Drag to reorder:</strong> Click and hold the grip icon to rearrange tasks</span>
            </div>
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">✓</span>
              <span><strong>Use AI:</strong> Ask ChatGPT/Claude to generate steps</span>
            </div>
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">✓</span>
              <span><strong>Include measurements:</strong> Specific quantities help</span>
            </div>
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">✓</span>
              <span><strong>Add safety notes:</strong> Warnings and precautions</span>
            </div>
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">✓</span>
              <span><strong>List tools needed:</strong> What equipment is required</span>
            </div>
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">✓</span>
              <span><strong>Use action verbs:</strong> Remove, Install, Test, Clean</span>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Importer Modal */}
      {showBulkImporter && (
        <BulkTaskImporter
          onImport={handleBulkImport}
          onClose={() => setShowBulkImporter(false)}
        />
      )}
    </div>
  );
};

export default TaskTab;