// src/pages/labor/components/laborModal/DraggableTaskItem.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical } from 'lucide-react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import type { TaskEntry } from '../../../../../services/inventory/labor/labor.types';

interface DraggableTaskItemProps {
  task: TaskEntry;
  index: number;
  disabled: boolean;
  onUpdate: (id: string, field: 'name' | 'description', value: string) => void;
  onRemove: (id: string) => void;
}

export const DraggableTaskItem: React.FC<DraggableTaskItemProps> = ({
  task,
  index,
  disabled,
  onUpdate,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled: disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  // Collapsed view (while dragging)
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center space-x-3 p-4 border-2 border-orange-400 rounded-lg bg-orange-50 shadow-lg"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white font-bold text-xl shadow-md">
          {index + 1}
        </div>
        <div className="flex-1 font-medium text-gray-900">
          {task.name || 'Untitled Task'}
        </div>
      </div>
    );
  }

  // Normal view (expanded with all fields)
  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white"
    >
      {/* Drag Handle + Task Number */}
      <div 
        {...attributes}
        {...listeners}
        className="flex flex-col items-center cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-6 h-6 text-gray-400 hover:text-orange-500 transition-colors mb-2" />
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600 font-bold text-xl border-2 border-orange-300 shadow-sm">
          {index + 1}
        </div>
      </div>

      {/* Task Fields */}
      <div className="flex-1 space-y-3">
        {/* Task Name */}
        <FormField label="Task Name" required>
          <InputField
            type="text"
            value={task.name}
            onChange={(e) => !disabled && onUpdate(task.id, 'name', e.target.value)}
            placeholder={`e.g., Remove old toilet seat`}
            disabled={disabled}
            required
          />
        </FormField>

        {/* Task Description */}
        <FormField label="Task Description">
          <textarea
            value={task.description || ''}
            onChange={(e) => !disabled && onUpdate(task.id, 'description', e.target.value)}
            placeholder="Step-by-step instructions...
Example:
• Locate the bolts
• Unscrew the bolts
• Remove the seat"
            disabled={disabled}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-400 text-sm resize-y"
          />
        </FormField>
      </div>

      {/* Remove Button */}
      {!disabled && (
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2"
          title="Remove task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};