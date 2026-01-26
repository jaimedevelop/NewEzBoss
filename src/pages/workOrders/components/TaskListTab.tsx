// src/pages/workOrders/components/TaskListTab.tsx

import React from 'react';
import { ListTodo, CheckCircle2, Circle, Camera } from 'lucide-react';
import { WorkOrderTask } from '../../../services/workOrders/workOrders.types';

interface TaskListTabProps {
    tasks: WorkOrderTask[];
    onToggleTask: (taskId: string, currentStatus: boolean) => void;
    onUploadTaskMedia: (taskId: string) => void;
}

const TaskListTab: React.FC<TaskListTabProps> = ({ tasks, onToggleTask, onUploadTaskMedia }) => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Labor Task List</h3>
                <div className="text-sm font-medium text-gray-600">
                    {tasks.filter(t => t.isCompleted).length} of {tasks.length} tasks completed
                </div>
            </div>

            <div className="space-y-4">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className={`p-4 rounded-xl border transition-all ${task.isCompleted
                                ? 'bg-blue-50 border-blue-100'
                                : 'bg-white border-gray-200'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <button
                                onClick={() => onToggleTask(task.id, task.isCompleted)}
                                className={`mt-1 transition-colors ${task.isCompleted ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}`}
                            >
                                {task.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                            </button>

                            <div className="flex-1">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h4 className={`font-semibold ${task.isCompleted ? 'text-blue-900 line-through opacity-75' : 'text-gray-900'}`}>
                                        {task.name}
                                    </h4>
                                    <button
                                        onClick={() => onUploadTaskMedia(task.id)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-orange-600 bg-gray-100 hover:bg-orange-50 px-2 py-1 rounded-md transition-all"
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span>Upload Photo</span>
                                    </button>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>

                                {task.media && task.media.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {task.media.map((m) => (
                                            <div key={m.id} className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden border border-gray-300">
                                                <img src={m.url} alt={m.fileName} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {tasks.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No labor tasks defined for this work order.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskListTab;
