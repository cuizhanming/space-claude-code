/* Task Management System */

import { EVENTS } from '../constants/events.js';
import { generateId, logError, emit, sanitizeHtml, debounce } from '../utils/helpers.js';
import { validateTaskTitle, validateTaskPriority } from '../utils/validation.js';
import { getStorageService } from './storage.js';
import { getStateManager } from './stateManager.js';

// === TASK MANAGER CLASS === */
export class TaskManager {
  constructor() {
    this.storage = getStorageService();
    this.state = getStateManager();
    this.cache = new Map();
    this.isInitialized = false;
    
    // Debounced save function to prevent excessive storage writes
    this.debouncedSave = debounce(this.saveToStorage.bind(this), 500);
    
    this.init();
  }

  // === INITIALIZATION === */
  async init() {
    try {
      // Load existing tasks from storage
      const storedTasks = await this.storage.loadTasks();
      
      if (storedTasks.length > 0) {
        // Update state with loaded tasks
        this.state.setState({
          tasks: storedTasks
        }, 'taskManager.init');
        
        console.log(`Loaded ${storedTasks.length} tasks from storage`);
      }

      this.isInitialized = true;
      
      // Subscribe to state changes for auto-save
      this.state.subscribe((newState, prevState, source) => {
        if (source !== 'taskManager.init' && newState.tasks !== prevState.tasks) {
          this.debouncedSave(newState.tasks);
        }
      });

      emit(document, EVENTS.COMPONENT_MOUNTED, {
        component: 'TaskManager',
        taskCount: storedTasks.length
      });

    } catch (error) {
      logError(error, 'TaskManager.init');
      this.handleError(error, 'Failed to initialize task manager');
    }
  }

  // === TASK CRUD OPERATIONS === */
  async createTask(taskData) {
    try {
      // Validate input data
      const validation = this.validateTaskData(taskData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Create task object
      const task = {
        id: generateId(),
        title: sanitizeHtml(taskData.title.trim()),
        completed: false,
        priority: taskData.priority || 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      // Add to state
      const newTask = this.state.addTask(task);
      
      // Update cache
      this.cache.set(task.id, newTask);

      console.log('TaskManager.createTask: task created and added to state', newTask);

      emit(document, EVENTS.TASK_CREATED, { 
        task: newTask,
        timestamp: new Date().toISOString()
      });

      return newTask;
    } catch (error) {
      logError(error, 'TaskManager.createTask');
      this.handleError(error, 'Failed to create task');
      throw error;
    }
  }

  async updateTask(taskId, updates) {
    try {
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      const existingTask = this.getTask(taskId);
      if (!existingTask) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      // Validate updates
      const validation = this.validateTaskUpdates(updates);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Prepare sanitized updates
      const sanitizedUpdates = {};
      
      if (updates.title !== undefined) {
        sanitizedUpdates.title = sanitizeHtml(updates.title.trim());
      }
      
      if (updates.completed !== undefined) {
        sanitizedUpdates.completed = Boolean(updates.completed);
        if (sanitizedUpdates.completed && !existingTask.completed) {
          sanitizedUpdates.completedAt = new Date().toISOString();
        } else if (!sanitizedUpdates.completed && existingTask.completed) {
          sanitizedUpdates.completedAt = null;
        }
      }
      
      if (updates.priority !== undefined) {
        sanitizedUpdates.priority = updates.priority;
      }

      sanitizedUpdates.updatedAt = new Date().toISOString();

      // Update in state
      const updatedTask = this.state.updateTask(taskId, sanitizedUpdates);
      
      // Update cache
      this.cache.set(taskId, updatedTask);

      emit(document, EVENTS.TASK_UPDATED, { 
        task: updatedTask,
        updates: sanitizedUpdates,
        timestamp: new Date().toISOString()
      });

      return updatedTask;
    } catch (error) {
      logError(error, 'TaskManager.updateTask');
      this.handleError(error, 'Failed to update task');
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      const existingTask = this.getTask(taskId);
      if (!existingTask) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      // Remove from state
      const deletedTask = this.state.deleteTask(taskId);
      
      // Remove from cache
      this.cache.delete(taskId);

      emit(document, EVENTS.TASK_DELETED, { 
        task: deletedTask,
        timestamp: new Date().toISOString()
      });

      return deletedTask;
    } catch (error) {
      logError(error, 'TaskManager.deleteTask');
      this.handleError(error, 'Failed to delete task');
      throw error;
    }
  }

  async toggleTaskComplete(taskId) {
    try {
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      const existingTask = this.getTask(taskId);
      if (!existingTask) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      const wasCompleted = existingTask.completed;
      const updatedTask = this.state.toggleTaskComplete(taskId);
      
      // Update cache
      this.cache.set(taskId, updatedTask);

      // Emit specific completion event
      if (!wasCompleted && updatedTask.completed) {
        emit(document, EVENTS.TASK_COMPLETED, { 
          task: updatedTask,
          timestamp: new Date().toISOString()
        });
      } else if (wasCompleted && !updatedTask.completed) {
        emit(document, EVENTS.TASK_UNCOMPLETED, { 
          task: updatedTask,
          timestamp: new Date().toISOString()
        });
      }

      return updatedTask;
    } catch (error) {
      logError(error, 'TaskManager.toggleTaskComplete');
      this.handleError(error, 'Failed to toggle task completion');
      throw error;
    }
  }

  // === TASK RETRIEVAL === */
  getTask(taskId) {
    // Check cache first
    if (this.cache.has(taskId)) {
      return this.cache.get(taskId);
    }

    // Get from state
    const task = this.state.getTask(taskId);
    if (task) {
      this.cache.set(taskId, task);
    }
    
    return task;
  }

  getAllTasks() {
    return this.state.getAllTasks();
  }

  getFilteredTasks() {
    return this.state.getFilteredTasks();
  }

  // === BULK OPERATIONS === */
  async createMultipleTasks(tasksData) {
    try {
      if (!Array.isArray(tasksData) || tasksData.length === 0) {
        throw new Error('Tasks data must be a non-empty array');
      }

      const validatedTasks = [];
      const errors = [];

      // Validate all tasks first
      tasksData.forEach((taskData, index) => {
        const validation = this.validateTaskData(taskData);
        if (validation.isValid) {
          validatedTasks.push({
            ...taskData,
            title: sanitizeHtml(taskData.title.trim())
          });
        } else {
          errors.push(`Task ${index + 1}: ${validation.errors.join(', ')}`);
        }
      });

      if (errors.length > 0) {
        throw new Error('Validation errors: ' + errors.join('; '));
      }

      // Create tasks in batch
      const createdTasks = this.state.addMultipleTasks(validatedTasks);
      
      // Update cache
      createdTasks.forEach(task => {
        this.cache.set(task.id, task);
      });

      emit(document, EVENTS.BULK_SELECT, { 
        tasks: createdTasks,
        operation: 'create',
        timestamp: new Date().toISOString()
      });

      return createdTasks;
    } catch (error) {
      logError(error, 'TaskManager.createMultipleTasks');
      this.handleError(error, 'Failed to create multiple tasks');
      throw error;
    }
  }

  async deleteMultipleTasks(taskIds) {
    try {
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        throw new Error('Task IDs must be a non-empty array');
      }

      // Validate all task IDs exist
      const tasksToDelete = [];
      const notFound = [];

      taskIds.forEach(taskId => {
        const task = this.getTask(taskId);
        if (task) {
          tasksToDelete.push(task);
        } else {
          notFound.push(taskId);
        }
      });

      if (notFound.length > 0) {
        console.warn(`Tasks not found: ${notFound.join(', ')}`);
      }

      if (tasksToDelete.length === 0) {
        throw new Error('No valid tasks found to delete');
      }

      // Delete tasks in batch
      const deletedTasks = this.state.deleteMultipleTasks(tasksToDelete.map(t => t.id));
      
      // Update cache
      tasksToDelete.forEach(task => {
        this.cache.delete(task.id);
      });

      emit(document, EVENTS.BULK_DELETE, { 
        tasks: deletedTasks,
        timestamp: new Date().toISOString()
      });

      return deletedTasks;
    } catch (error) {
      logError(error, 'TaskManager.deleteMultipleTasks');
      this.handleError(error, 'Failed to delete multiple tasks');
      throw error;
    }
  }

  async clearCompletedTasks() {
    try {
      const completedTasks = this.state.clearCompletedTasks();
      
      // Update cache
      completedTasks.forEach(task => {
        this.cache.delete(task.id);
      });

      emit(document, EVENTS.BULK_DELETE, { 
        tasks: completedTasks,
        operation: 'clearCompleted',
        timestamp: new Date().toISOString()
      });

      return completedTasks;
    } catch (error) {
      logError(error, 'TaskManager.clearCompletedTasks');
      this.handleError(error, 'Failed to clear completed tasks');
      throw error;
    }
  }

  // === SEARCH AND FILTER === */
  searchTasks(query) {
    try {
      if (!query || typeof query !== 'string') {
        return this.getAllTasks();
      }

      const searchQuery = query.toLowerCase().trim();
      if (searchQuery.length === 0) {
        return this.getAllTasks();
      }

      const allTasks = this.getAllTasks();
      const results = allTasks.filter(task => {
        return task.title.toLowerCase().includes(searchQuery);
      });

      emit(document, EVENTS.SEARCH_RESULTS_UPDATED, {
        query: searchQuery,
        resultCount: results.length,
        totalTasks: allTasks.length
      });

      return results;
    } catch (error) {
      logError(error, 'TaskManager.searchTasks');
      return [];
    }
  }

  sortTasks(tasks, sortBy = 'createdAt', direction = 'desc') {
    try {
      if (!Array.isArray(tasks)) {
        return [];
      }

      const validSortFields = ['createdAt', 'updatedAt', 'title', 'priority', 'completed'];
      if (!validSortFields.includes(sortBy)) {
        sortBy = 'createdAt';
      }

      const sortedTasks = [...tasks].sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];

        // Special handling for different field types
        if (sortBy === 'title') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        } else if (sortBy === 'priority') {
          const priorityOrder = { low: 1, medium: 2, high: 3 };
          aVal = priorityOrder[aVal] || 2;
          bVal = priorityOrder[bVal] || 2;
        } else if (sortBy === 'completed') {
          aVal = aVal ? 1 : 0;
          bVal = bVal ? 1 : 0;
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });

      return sortedTasks;
    } catch (error) {
      logError(error, 'TaskManager.sortTasks');
      return tasks || [];
    }
  }

  // === STATISTICS === */
  getTaskStatistics() {
    try {
      const allTasks = this.getAllTasks();
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const stats = {
        total: allTasks.length,
        completed: allTasks.filter(task => task.completed).length,
        active: allTasks.filter(task => !task.completed).length,
        todayCreated: allTasks.filter(task => task.createdAt.startsWith(today)).length,
        todayCompleted: allTasks.filter(task => 
          task.completed && task.completedAt && task.completedAt.startsWith(today)
        ).length,
        byPriority: {
          low: allTasks.filter(task => task.priority === 'low').length,
          medium: allTasks.filter(task => task.priority === 'medium').length,
          high: allTasks.filter(task => task.priority === 'high').length
        },
        completionRate: allTasks.length > 0 ? 
          Math.round((allTasks.filter(task => task.completed).length / allTasks.length) * 100) : 0
      };

      return stats;
    } catch (error) {
      logError(error, 'TaskManager.getTaskStatistics');
      return {
        total: 0,
        completed: 0,
        active: 0,
        todayCreated: 0,
        todayCompleted: 0,
        byPriority: { low: 0, medium: 0, high: 0 },
        completionRate: 0
      };
    }
  }

  // === VALIDATION === */
  validateTaskData(taskData) {
    const errors = [];

    if (!taskData || typeof taskData !== 'object') {
      errors.push('Task data must be an object');
      return { isValid: false, errors };
    }

    // Validate title
    const titleValidation = validateTaskTitle(taskData.title);
    if (!titleValidation.isValid) {
      errors.push(...titleValidation.errors);
    }

    // Validate priority
    if (taskData.priority) {
      const priorityValidation = validateTaskPriority(taskData.priority);
      if (!priorityValidation.isValid) {
        errors.push(...priorityValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateTaskUpdates(updates) {
    const errors = [];

    if (!updates || typeof updates !== 'object') {
      errors.push('Updates must be an object');
      return { isValid: false, errors };
    }

    // Validate title if provided
    if (updates.title !== undefined) {
      const titleValidation = validateTaskTitle(updates.title);
      if (!titleValidation.isValid) {
        errors.push(...titleValidation.errors);
      }
    }

    // Validate priority if provided
    if (updates.priority !== undefined) {
      const priorityValidation = validateTaskPriority(updates.priority);
      if (!priorityValidation.isValid) {
        errors.push(...priorityValidation.errors);
      }
    }

    // Validate completed if provided
    if (updates.completed !== undefined && typeof updates.completed !== 'boolean') {
      errors.push('Completed status must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // === STORAGE OPERATIONS === */
  async saveToStorage(tasks) {
    try {
      const success = await this.storage.saveTasks(tasks);
      if (success) {
        emit(document, EVENTS.STORAGE_SAVED, {
          type: 'tasks',
          count: tasks.length,
          timestamp: new Date().toISOString()
        });
      }
      return success;
    } catch (error) {
      logError(error, 'TaskManager.saveToStorage');
      this.handleError(error, 'Failed to save tasks to storage');
      return false;
    }
  }

  async loadFromStorage() {
    try {
      const tasks = await this.storage.loadTasks();
      this.state.setState({ tasks }, 'taskManager.loadFromStorage');
      
      // Update cache
      this.cache.clear();
      tasks.forEach(task => {
        this.cache.set(task.id, task);
      });

      return tasks;
    } catch (error) {
      logError(error, 'TaskManager.loadFromStorage');
      this.handleError(error, 'Failed to load tasks from storage');
      return [];
    }
  }

  // === UTILITY METHODS === */
  clearCache() {
    this.cache.clear();
  }

  getCacheSize() {
    return this.cache.size;
  }

  isReady() {
    return this.isInitialized;
  }

  // === ERROR HANDLING === */
  handleError(error, userMessage) {
    emit(document, EVENTS.APP_ERROR, {
      error,
      context: 'TaskManager',
      userMessage,
      timestamp: new Date().toISOString()
    });

    // Show user-friendly notification
    this.state.showNotification(
      userMessage || 'An error occurred while managing tasks',
      'error',
      { autoHide: true, duration: 5000 }
    );
  }

  // === CLEANUP === */
  destroy() {
    this.cache.clear();
    this.isInitialized = false;
    
    emit(document, EVENTS.COMPONENT_UNMOUNTED, {
      component: 'TaskManager'
    });
  }
}

// === SINGLETON INSTANCE === */
let taskManagerInstance = null;

export function getTaskManager() {
  if (!taskManagerInstance) {
    taskManagerInstance = new TaskManager();
  }
  return taskManagerInstance;
}

// Export default instance
export default getTaskManager();