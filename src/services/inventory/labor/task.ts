// src/services/inventory/labor/task.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';

// Collection name
const COLLECTION_NAME = 'taskBasedLabor';

// Types
export interface TaskBasedLabor {
  id?: string;
  name: string;
  description: string;
  rate1: number;
  rate2: number;
  category: string;
  estimatedHours?: number;
  isActive: boolean;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface TaskFilters {
  category?: string;
  isActive?: boolean;
}

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

/**
 * Create a new task-based labor item
 */
export const createTask = async (
  taskData: Omit<TaskBasedLabor, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DatabaseResult> => {
  try {
    const taskRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      id: taskRef.id,
      data: { id: taskRef.id, ...taskData }
    };
  } catch (error) {
    console.error('Error creating task-based labor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create task'
    };
  }
};

/**
 * Get all task-based labor items with optional filters
 */
export const getTasks = async (
  filters: TaskFilters = {}
): Promise<DatabaseResult<TaskBasedLabor[]>> => {
  try {
    let q = collection(db, COLLECTION_NAME);

    // Build query with filters
    const constraints = [];

    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }

    if (filters.isActive !== undefined) {
      constraints.push(where('isActive', '==', filters.isActive));
    }

    // Order by name
    constraints.push(orderBy('name', 'asc'));

    if (constraints.length > 0) {
      q = query(collection(db, COLLECTION_NAME), ...constraints);
    } else {
      q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
    }

    const querySnapshot = await getDocs(q);
    const tasks: TaskBasedLabor[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TaskBasedLabor[];

    return {
      success: true,
      data: tasks
    };
  } catch (error) {
    console.error('Error getting task-based labor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tasks',
      data: []
    };
  }
};

/**
 * Get a single task-based labor item by ID
 */
export const getTask = async (
  taskId: string
): Promise<DatabaseResult<TaskBasedLabor>> => {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    const taskSnap = await getDoc(taskRef);

    if (taskSnap.exists()) {
      return {
        success: true,
        data: { id: taskSnap.id, ...taskSnap.data() } as TaskBasedLabor
      };
    } else {
      return {
        success: false,
        error: 'Task not found'
      };
    }
  } catch (error) {
    console.error('Error getting task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get task'
    };
  }
};

/**
 * Update an existing task-based labor item
 */
export const updateTask = async (
  taskId: string,
  taskData: Partial<TaskBasedLabor>
): Promise<DatabaseResult> => {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    
    // Remove id and timestamps from update data if present
    const { id, createdAt, ...updateData } = taskData as any;

    await updateDoc(taskRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      id: taskId
    };
  } catch (error) {
    console.error('Error updating task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task'
    };
  }
};

/**
 * Delete a task-based labor item
 */
export const deleteTask = async (taskId: string): Promise<DatabaseResult> => {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await deleteDoc(taskRef);

    return {
      success: true,
      id: taskId
    };
  } catch (error) {
    console.error('Error deleting task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete task'
    };
  }
};

/**
 * Get all active tasks (helper function)
 */
export const getActiveTasks = async (): Promise<DatabaseResult<TaskBasedLabor[]>> => {
  return getTasks({ isActive: true });
};

/**
 * Get tasks by category
 */
export const getTasksByCategory = async (
  category: string
): Promise<DatabaseResult<TaskBasedLabor[]>> => {
  return getTasks({ category });
};

/**
 * Toggle task active status
 */
export const toggleTaskActive = async (
  taskId: string,
  isActive: boolean
): Promise<DatabaseResult> => {
  return updateTask(taskId, { isActive });
};

/**
 * Search tasks by name (client-side filtering)
 */
export const searchTasks = async (
  searchTerm: string
): Promise<DatabaseResult<TaskBasedLabor[]>> => {
  try {
    const result = await getTasks();
    
    if (!result.success || !result.data) {
      return result;
    }

    const searchLower = searchTerm.toLowerCase();
    const filteredTasks = result.data.filter(task =>
      task.name.toLowerCase().includes(searchLower) ||
      task.description.toLowerCase().includes(searchLower) ||
      task.category.toLowerCase().includes(searchLower)
    );

    return {
      success: true,
      data: filteredTasks
    };
  } catch (error) {
    console.error('Error searching tasks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search tasks',
      data: []
    };
  }
};