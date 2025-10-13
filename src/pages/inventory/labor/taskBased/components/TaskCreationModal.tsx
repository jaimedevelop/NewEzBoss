import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TaskBasedLabor } from '../TaskBased';

interface TaskCreationModalProps {
  task: TaskBasedLabor | null;
  onClose: () => void;
  onSave: (taskData: Partial<TaskBasedLabor>) => void;
}

export const TaskCreationModal: React.FC<TaskCreationModalProps> = ({ task, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rate1: '',
    rate2: '',
    category: '',
    estimatedHours: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        description: task.description,
        rate1: task.rate1?.toString() || '',
        rate2: task.rate2?.toString() || '',
        category: task.category,
        estimatedHours: task.estimatedHours?.toString() || '',
        isActive: task.isActive,
      });
    }
  }, [task]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    }

    if (!formData.rate1 || parseFloat(formData.rate1) <= 0) {
      newErrors.rate1 = 'Flat Rate 1 must be greater than 0';
    }

    if (!formData.rate2 || parseFloat(formData.rate2) <= 0) {
      newErrors.rate2 = 'Flat Rate 2 must be greater than 0';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (formData.estimatedHours && parseFloat(formData.estimatedHours) < 0) {
      newErrors.estimatedHours = 'Estimated hours cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const taskData: Partial<TaskBasedLabor> = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      rate1: parseFloat(formData.rate1),
      rate2: parseFloat(formData.rate2),
      category: formData.category.trim(),
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      isActive: formData.isActive,
    };

    onSave(taskData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {task ? 'Edit Task' : 'Add New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Toilet Removal"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the task"
            />
          </div>

          {/* Flat Rates Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Flat Rate 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flat Rate 1 ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.rate1}
                onChange={(e) => setFormData({ ...formData, rate1: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.rate1 ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="80.00"
              />
              {errors.rate1 && (
                <p className="mt-1 text-sm text-red-600">{errors.rate1}</p>
              )}
            </div>

            {/* Flat Rate 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flat Rate 2 ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.rate2}
                onChange={(e) => setFormData({ ...formData, rate2: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.rate2 ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="120.00"
              />
              {errors.rate2 && (
                <p className="mt-1 text-sm text-red-600">{errors.rate2}</p>
              )}
            </div>
          </div>

          {/* Category and Estimated Hours Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Removal, Installation"
              />
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Hours (Optional)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.estimatedHours ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="2.5"
              />
              {errors.estimatedHours && (
                <p className="mt-1 text-sm text-red-600">{errors.estimatedHours}</p>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500">
            How long this task typically takes to complete
          </p>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Active (available for use in estimates and projects)
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreationModal;