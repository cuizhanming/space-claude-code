/* State Management System */

import { EVENTS } from '../constants/events.js';
import { generateId, deepClone, logError, emit } from '../utils/helpers.js';

// === STATE MANAGER CLASS === */
import { getStorageService } from './storage.js';

export class StateManager {
  constructor() {
    this.state = this.getInitialState();
    this.subscribers = new Set();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;
    this.isUpdating = false;

    // Load tasks from storage if available
    const storage = getStorageService();
    if (storage && typeof storage.loadTasks === 'function') {
      storage.loadTasks().then(tasks => {
        if (Array.isArray(tasks) && tasks.length > 0) {
          this.setState({ tasks }, 'init:loadTasks');
        }
      }).catch(err => {
        // ignore load error, fallback to empty
        console.warn('Failed to load tasks from storage', err);
      });
    }
  }

  // === INITIAL STATE === */
  getInitialState() {
    return {
      tasks: [],
      filters: {
        status: 'all',        // 'all', 'active', 'completed'
        priority: 'all',      // 'all', 'low', 'medium', 'high'
        searchQuery: ''
      },
      ui: {
        theme: 'light',       // 'light', 'dark'
        sidebarOpen: false,
        modalOpen: false,
        currentModal: null,
        notification: {
          message: '',
          type: 'info',       // 'success', 'error', 'warning', 'info'
          visible: false,
          autoHide: true,
          duration: 5000
        },
        loading: false,
        editingTaskId: null,
        selectedTaskIds: []
      },
      settings: {
        maxTasks: 1000,
        autoSave: true,
        confirmDeletion: true,
        showCompletedTasks: true,
        taskSortBy: 'createdAt',    // 'createdAt', 'updatedAt', 'title', 'priority'
        taskSortDirection: 'desc'   // 'asc', 'desc'
      },
      statistics: {
        totalTasks: 0,
        completedTasks: 0,
        activeTasks: 0,
        todayCreated: 0,
        todayCompleted: 0
      },
      lastUpdated: new Date().toISOString()
    };
  }

  // === CORE STATE METHODS === */
  getState() {
    return deepClone(this.state);
  }

  setState(updates, source = 'unknown') {
    if (this.isUpdating) {
      console.warn('State update called during state update, ignoring');
      return;
    }

    try {
      this.isUpdating = true;
      
      // Create new state
      const previousState = deepClone(this.state);
      const newState = this.applyUpdates(this.state, updates);
      
      // Apply middleware
      const processedState = this.applyMiddleware(newState, previousState, source);
      
      // Update state
      this.state = processedState;
      this.state.lastUpdated = new Date().toISOString();
      
      // Add to history
      this.addToHistory(previousState, source);
      
      // Update statistics
      this.updateStatistics();
      
      // Notify subscribers
      this.notifySubscribers(previousState, this.state, source);
      
      // Emit global event
      emit(document, EVENTS.STATE_CHANGED, {
        previousState,
        newState: this.state,
        source
      });
      
    } catch (error) {
      logError(error, 'StateManager.setState');
      this.handleStateError(error, updates, source);
    } finally {
      this.isUpdating = false;
    }
  }

  applyUpdates(currentState, updates) {
    if (typeof updates === 'function') {
      return updates(deepClone(currentState));
    }
    
    const newState = deepClone(currentState);
    return this.mergeDeep(newState, updates);
  }

  mergeDeep(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.mergeDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  // === TASK OPERATIONS === */
  addTask(taskData) {
    const task = {
      id: generateId(),
      title: taskData.title,
      completed: false,
      priority: taskData.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...taskData
    };

    this.setState(state => ({
      tasks: [...state.tasks, task]
    }), 'addTask');

    // Persist to storage
    const storage = getStorageService();
    storage.saveTasks(this.state.tasks);

    console.log('StateManager.addTask: task added', task);
    emit(document, EVENTS.TASK_CREATED, { task });
    return task;
  }

  updateTask(taskId, updates) {
    const taskIndex = this.state.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    this.setState(state => {
      const newTasks = [...state.tasks];
      newTasks[taskIndex] = {
        ...newTasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return { tasks: newTasks };
    }, 'updateTask');

    // Persist to storage
    const storage = getStorageService();
    storage.saveTasks(this.state.tasks);

    const updatedTask = this.state.tasks[taskIndex];
    emit(document, EVENTS.TASK_UPDATED, { task: updatedTask, updates });
    return updatedTask;
  }

  deleteTask(taskId) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    this.setState(state => ({
      tasks: state.tasks.filter(t => t.id !== taskId)
    }), 'deleteTask');

    // Persist to storage
    const storage = getStorageService();
    storage.saveTasks(this.state.tasks);

    emit(document, EVENTS.TASK_DELETED, { task });
    return task;
  }

  toggleTaskComplete(taskId) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const wasCompleted = task.completed;
    const updates = {
      completed: !wasCompleted,
      completedAt: !wasCompleted ? new Date().toISOString() : null
    };

    const updatedTask = this.updateTask(taskId, updates);
    
    emit(document, wasCompleted ? EVENTS.TASK_UNCOMPLETED : EVENTS.TASK_COMPLETED, { 
      task: updatedTask 
    });
    
    return updatedTask;
  }

  getTask(taskId) {
    return this.state.tasks.find(task => task.id === taskId) || null;
  }

  getAllTasks() {
    return [...this.state.tasks];
  }

  // === BULK OPERATIONS === */
  addMultipleTasks(tasksData) {
    const tasks = tasksData.map(taskData => ({
      id: generateId(),
      title: taskData.title,
      completed: false,
      priority: taskData.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...taskData
    }));

    this.setState(state => ({
      tasks: [...state.tasks, ...tasks]
    }), 'addMultipleTasks');

    tasks.forEach(task => {
      emit(document, EVENTS.TASK_CREATED, { task });
    });

    return tasks;
  }

  deleteMultipleTasks(taskIds) {
    const tasksToDelete = this.state.tasks.filter(task => taskIds.includes(task.id));
    
    this.setState(state => ({
      tasks: state.tasks.filter(task => !taskIds.includes(task.id))
    }), 'deleteMultipleTasks');

    emit(document, EVENTS.BULK_DELETE, { tasks: tasksToDelete });
    return tasksToDelete;
  }

  clearCompletedTasks() {
    const completedTasks = this.state.tasks.filter(task => task.completed);
    
    this.setState(state => ({
      tasks: state.tasks.filter(task => !task.completed)
    }), 'clearCompletedTasks');

    return completedTasks;
  }

  // === FILTER OPERATIONS === */
  setFilter(filterType, value) {
    this.setState(state => ({
      filters: {
        ...state.filters,
        [filterType]: value
      }
    }), 'setFilter');

    emit(document, EVENTS.FILTER_CHANGED, { 
      filterType, 
      value, 
      filters: this.state.filters 
    });
  }

  clearFilters() {
    const defaultFilters = this.getInitialState().filters;
    
    this.setState(state => ({
      filters: { ...defaultFilters }
    }), 'clearFilters');

    emit(document, EVENTS.FILTER_CLEARED, { filters: this.state.filters });
  }

  getFilteredTasks() {
    const { tasks, filters } = this.state;
    
    return tasks.filter(task => {
      // Status filter
      if (filters.status === 'active' && task.completed) return false;
      if (filters.status === 'completed' && !task.completed) return false;
      
      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
      
      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(query)) return false;
      }
      
      return true;
    });
  }

  // === UI OPERATIONS === */
  setTheme(theme) {
    this.setState(state => ({
      ui: {
        ...state.ui,
        theme
      }
    }), 'setTheme');

    emit(document, EVENTS.THEME_CHANGED, { theme });
  }

  toggleSidebar() {
    this.setState(state => ({
      ui: {
        ...state.ui,
        sidebarOpen: !state.ui.sidebarOpen
      }
    }), 'toggleSidebar');

    emit(document, EVENTS.SIDEBAR_TOGGLED, { open: this.state.ui.sidebarOpen });
  }

  openModal(modalType, data = {}) {
    this.setState(state => ({
      ui: {
        ...state.ui,
        modalOpen: true,
        currentModal: { type: modalType, data }
      }
    }), 'openModal');

    emit(document, EVENTS.MODAL_OPEN, { modalType, data });
  }

  closeModal() {
    this.setState(state => ({
      ui: {
        ...state.ui,
        modalOpen: false,
        currentModal: null
      }
    }), 'closeModal');

    emit(document, EVENTS.MODAL_CLOSE, {});
  }

  showNotification(message, type = 'info', options = {}) {
    const notification = {
      message,
      type,
      visible: true,
      autoHide: options.autoHide !== false,
      duration: options.duration || 5000,
      id: generateId()
    };

    this.setState(state => ({
      ui: {
        ...state.ui,
        notification
      }
    }), 'showNotification');

    emit(document, EVENTS.NOTIFICATION_SHOW, notification);

    // Auto-hide if enabled
    if (notification.autoHide) {
      setTimeout(() => {
        this.hideNotification();
      }, notification.duration);
    }

    return notification.id;
  }

  hideNotification() {
    this.setState(state => ({
      ui: {
        ...state.ui,
        notification: {
          ...state.ui.notification,
          visible: false
        }
      }
    }), 'hideNotification');

    emit(document, EVENTS.NOTIFICATION_HIDE, {});
  }

  setLoading(loading) {
    this.setState(state => ({
      ui: {
        ...state.ui,
        loading
      }
    }), 'setLoading');
  }

  setEditingTask(taskId) {
    this.setState(state => ({
      ui: {
        ...state.ui,
        editingTaskId: taskId
      }
    }), 'setEditingTask');

    if (taskId) {
      emit(document, EVENTS.TASK_EDIT_START, { taskId });
    } else {
      emit(document, EVENTS.TASK_EDIT_END, {});
    }
  }

  // === SUBSCRIPTION SYSTEM === */
  subscribe(callback) {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  notifySubscribers(previousState, newState, source) {
    this.subscribers.forEach(callback => {
      try {
        callback(newState, previousState, source);
      } catch (error) {
        logError(error, 'StateManager.notifySubscribers');
      }
    });
  }

  // === MIDDLEWARE SYSTEM === */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  applyMiddleware(newState, previousState, source) {
    return this.middleware.reduce((state, middleware) => {
      try {
        return middleware(state, previousState, source) || state;
      } catch (error) {
        logError(error, 'StateManager.applyMiddleware');
        return state;
      }
    }, newState);
  }

  // === HISTORY MANAGEMENT === */
  addToHistory(state, source) {
    this.history.push({
      state: deepClone(state),
      timestamp: new Date().toISOString(),
      source
    });

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  getHistory() {
    return [...this.history];
  }

  canUndo() {
    return this.history.length > 0;
  }

  undo() {
    if (!this.canUndo()) {
      throw new Error('No state to undo to');
    }

    const previousEntry = this.history.pop();
    this.state = previousEntry.state;
    this.state.lastUpdated = new Date().toISOString();

    this.updateStatistics();
    this.notifySubscribers({}, this.state, 'undo');
    
    emit(document, EVENTS.STATE_CHANGED, {
      previousState: {},
      newState: this.state,
      source: 'undo'
    });
  }

  // === STATISTICS === */
  updateStatistics() {
    const { tasks } = this.state;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const statistics = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(task => task.completed).length,
      activeTasks: tasks.filter(task => !task.completed).length,
      todayCreated: tasks.filter(task => task.createdAt.startsWith(today)).length,
      todayCompleted: tasks.filter(task => 
        task.completed && task.completedAt && task.completedAt.startsWith(today)
      ).length
    };

    this.state.statistics = statistics;
  }

  getStatistics() {
    return { ...this.state.statistics };
  }

  // === RESET AND CLEANUP === */
  reset() {
    this.state = this.getInitialState();
    this.history = [];
    
    this.notifySubscribers({}, this.state, 'reset');
    emit(document, EVENTS.STATE_RESET, { state: this.state });
  }

  destroy() {
    this.subscribers.clear();
    this.middleware = [];
    this.history = [];
    
    emit(document, EVENTS.APP_DESTROY, {});
  }

  // === ERROR HANDLING === */
  handleStateError(error, updates, source) {
    logError(error, `StateManager.handleStateError - Source: ${source}`);
    
    emit(document, EVENTS.APP_ERROR, {
      error,
      context: 'StateManager',
      updates,
      source
    });

    // Try to show user-friendly notification
    try {
      this.showNotification(
        'Something went wrong. Please try again.',
        'error',
        { autoHide: true, duration: 3000 }
      );
    } catch (notificationError) {
      console.error('Failed to show error notification:', notificationError);
    }
  }

  // === DEBUGGING === */
  getDebugInfo() {
    return {
      state: this.getState(),
      subscribers: this.subscribers.size,
      middleware: this.middleware.length,
      historySize: this.history.length,
      isUpdating: this.isUpdating
    };
  }

  logState() {
    console.log('Current State:', this.getState());
  }
}

// === SINGLETON INSTANCE === */
let stateManagerInstance = null;

export function getStateManager() {
  if (!stateManagerInstance) {
    stateManagerInstance = new StateManager();
  }
  return stateManagerInstance;
}

export function createStateManager() {
  return new StateManager();
}

// Export default instance
export default getStateManager();