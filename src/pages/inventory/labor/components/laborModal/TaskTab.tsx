// src/pages/labor/components/creationModal/TaskTab.tsx
import React from 'react';
import { Plus, Trash2, ClipboardList, GripVertical, CheckCircle } from 'lucide-react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import { AutoFormatTextarea } from '../../../../../mainComponents/forms/AutoFormatTextarea';
import { useLaborCreation } from '../../../../../contexts/LaborCreationContext';

interface TaskTabProps {
  disabled?: boolean;
}

const TaskTab: React.FC<TaskTabProps> = ({ disabled = false }) => {
  const { 
    state, 
    updateTaskEntry, 
    addTaskEntry, 
    removeTaskEntry
  } = useLaborCreation();
  
  const { formData } = state;

  const handleRemoveTask = (id: string) => {
    if (disabled) return;
    removeTaskEntry(id);
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
          <button
            type="button"
            onClick={addTaskEntry}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </button>
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

      {/* Task Entries */}
      <div className="space-y-4">
        {formData.tasks && formData.tasks.map((task, index) => (
          <div 
            key={task.id} 
            className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white"
          >
            {/* Drag Handle (visual only for now) */}
            <div className="flex flex-col items-center mt-2">
              <GripVertical className="w-5 h-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 mt-1">
                {index + 1}
              </span>
            </div>

            <div className="flex-1 space-y-4">
              {/* Task Name */}
              <FormField label="Task Name" required>
                <InputField
                  type="text"
                  value={task.name}
                  onChange={(e) => !disabled && updateTaskEntry(task.id, 'name', e.target.value)}
                  placeholder={`e.g., Remove old toilet seat`}
                  disabled={disabled}
                  required
                />
              </FormField>

              {/* Task Description with Auto-Formatting */}
              <div>
                <AutoFormatTextarea
                  value={task.description || ''}
                  onChange={(value) => !disabled && updateTaskEntry(task.id, 'description', value)}
                  placeholder="Paste your AI-generated steps here...

Example:
Remove the old seat
* Locate the bolts at the back
* Open the bolt caps if present
Clean the area
* Wipe down the rim
* Remove any residue"
                  disabled={disabled}
                  rows={14}
                  label="Task Description"
                />
              </div>
            </div>

            {/* Remove Button */}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveTask(task.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2"
                title="Remove task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {/* Empty State */}
        {(!formData.tasks || formData.tasks.length === 0) && (
          <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <ClipboardList className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <div className="text-base font-medium">No tasks added yet</div>
            <div className="text-sm mt-1 mb-4">
              Break down this labor task into clear, actionable steps
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={addTaskEntry}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Task
              </button>
            )}
          </div>
        )}
      </div>

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
              <span><strong>Use AI:</strong> Generate steps with ChatGPT/Claude</span>
            </div>
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">✓</span>
              <span><strong>Paste directly:</strong> Auto-formatting handles the rest</span>
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
    </div>
  );
};

export default TaskTab;