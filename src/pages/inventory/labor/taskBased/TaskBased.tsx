import React, { useState, useEffect, useCallback } from 'react';
import { TaskHeader } from './components/TaskHeader';
import { TaskFilter } from './components/TaskFilter';
import { TaskTable } from './components/TaskTable';
import { TaskCreationModal } from './components/TaskCreationModal';

export interface TaskBasedLabor {
  id: string;
  name: string;
  description: string;
  rate: number;
  category: string;
  estimatedHours?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const TaskBased: React.FC = () => {
  const [tasks, setTasks] = useState<TaskBasedLabor[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskBasedLabor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskBasedLabor | null>(null);
  const [loading, setLoading] = useState(true);

  // Load tasks from Firebase
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual Firebase call
      // const taskData = await getTaskBasedLabor();
      // setTasks(taskData);
      
      // Mock data for now
      const mockTasks: TaskBasedLabor[] = [
        {
          id: '1',
          name: 'Toilet Removal',
          description: 'Remove existing toilet',
          rate: 80,
          category: 'Removal',
          estimatedHours: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Toilet Installation',
          description: 'Install new toilet with wax ring',
          rate: 120,
          category: 'Installation',
          estimatedHours: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      setTasks(mockTasks);
      setFilteredTasks(mockTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: TaskBasedLabor) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        // TODO: Call Firebase delete function
        // await deleteTaskBasedLabor(taskId);
        setTasks(tasks.filter(t => t.id !== taskId));
        setFilteredTasks(filteredTasks.filter(t => t.id !== taskId));
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleSaveTask = async (taskData: Partial<TaskBasedLabor>) => {
    try {
      if (selectedTask) {
        // Update existing
        // TODO: Call Firebase update function
        const updatedTasks = tasks.map(t => 
          t.id === selectedTask.id ? { ...t, ...taskData, updatedAt: new Date() } : t
        );
        setTasks(updatedTasks);
        setFilteredTasks(updatedTasks);
      } else {
        // Create new
        // TODO: Call Firebase create function
        const newTask: TaskBasedLabor = {
          id: Date.now().toString(),
          ...taskData as TaskBasedLabor,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setTasks([...tasks, newTask]);
        setFilteredTasks([...filteredTasks, newTask]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleFilter = (searchTerm: string, category: string, status: string) => {
    let filtered = [...tasks];

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (category) {
      filtered = filtered.filter(task => task.category === category);
    }

    if (status === 'active') {
      filtered = filtered.filter(task => task.isActive);
    } else if (status === 'inactive') {
      filtered = filtered.filter(task => !task.isActive);
    }

    setFilteredTasks(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TaskHeader onAddTask={handleCreateTask} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TaskFilter onFilter={handleFilter} tasks={tasks} />
        
        <TaskTable
          tasks={filteredTasks}
          loading={loading}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />
      </div>

      {isModalOpen && (
        <TaskCreationModal
          task={selectedTask}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
};

export default TaskBased;