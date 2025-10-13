// src/services/inventory/labor/index.ts
// Central export file for all labor services

// Task-based labor exports
export {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getActiveTasks,
  getTasksByCategory,
  toggleTaskActive,
  searchTasks,
} from './task';

export type {
  TaskBasedLabor,
  TaskFilters,
} from './task';

// Time-based labor exports
export {
  createTimeRole,
  getTimeRoles,
  getTimeRole,
  updateTimeRole,
  deleteTimeRole,
  getActiveTimeRoles,
  getTimeRolesByCategory,
  getTimeRolesBySkillLevel,
  toggleTimeRoleActive,
  searchTimeRoles,
} from './time';

export type {
  TimeBasedLabor,
  TimeFilters,
} from './time';

// Re-export DatabaseResult type for convenience
export type { DatabaseResult } from './task';