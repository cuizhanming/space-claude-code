// js/data/schema.js
// Core data models for Todo List MVP

/**
 * @typedef {Object} Task
 * @property {string} id - Unique identifier for the task
 * @property {string} text - Task description (legacy field for backward compatibility)
 * @property {string} title - Task title/description (preferred field)
 * @property {boolean} completed - Completion status
 * @property {string} priority - Priority level ('low' | 'medium' | 'high')
 * @property {string} [category] - Task category (e.g., Work, Personal)
 * @property {string} [dueDate] - Due date in YYYY-MM-DD format
 * @property {string} [createdAt] - ISO date string for creation time
 * @property {string} [updatedAt] - ISO date string for last update time
 * @property {string} [completedAt] - ISO date string for completion time (if completed)
 */

/**
 * @typedef {Object} AppState
 * @property {Task[]} tasks - List of all tasks
 * @property {string} filter - Current filter ('all' | 'active' | 'completed')
 * @property {string} search - Current search query
 * @property {string} priorityFilter - Current priority filter ('all' | 'low' | 'medium' | 'high')
 */

// Example initial state
export const initialState = {
  tasks: [],
  filter: 'all',
  search: '',
  priorityFilter: 'all',
};

// Task model factory
export function createTask({ text, title, priority = 'medium', category, dueDate }) {
  const now = new Date().toISOString();
  
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2),
    text: text || title, // For backward compatibility
    title: title || text, // Preferred field
    completed: false,
    priority,
    category: category || undefined,
    dueDate: dueDate || undefined,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}
