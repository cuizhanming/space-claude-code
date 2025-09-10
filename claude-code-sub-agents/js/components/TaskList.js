/* Task List Component */

import { EVENTS } from '../constants/events.js';
import { on, off, emit, logError, announceToScreenReader, debounce } from '../utils/helpers.js';
import { TaskItem } from './TaskItem.js';
import { getTaskManager } from '../modules/taskManager.js';
import { getStateManager } from '../modules/stateManager.js';

// === TASK LIST COMPONENT === */
export class TaskList {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      enableVirtualScrolling: false,
      itemsPerPage: 50,
      enableKeyboardNavigation: true,
      enableEmptyState: true,
      enableNoResultsState: true,
      animateChanges: true,
      sortBy: 'createdAt',
      sortDirection: 'desc',
      ...options
    };

    this.taskManager = getTaskManager();
    this.state = getStateManager();
    this.elements = {};
    this.taskItems = new Map(); // taskId -> TaskItem instance
    this.listeners = [];
    this.currentTasks = [];
    this.currentPage = 0;
    this.focusedIndex = -1;
    
    // Debounced render to prevent excessive updates
    this.debouncedRender = debounce(this.render.bind(this), 100);
    
    this.init();
  }

  // === INITIALIZATION === */
  init() {
    try {
      if (!this.container) {
        throw new Error('TaskList container not found');
      }

      this.findElements();
      this.attachEventListeners();
      this.subscribeToStateChanges();
      
      // Initial render
      this.loadTasks();

      emit(document, EVENTS.COMPONENT_MOUNTED, {
        component: 'TaskList',
        container: this.container
      });

    } catch (error) {
      logError(error, 'TaskList.init');
      this.handleError(error, 'Failed to initialize task list');
    }
  }

  // === DOM ELEMENT DISCOVERY === */
  findElements() {
    this.elements = {
      list: this.container.querySelector('#task-list') || this.container.querySelector('.task-list'),
      emptyState: this.container.querySelector('#empty-state') || this.container.querySelector('.empty-state'),
      noResultsState: this.container.querySelector('#no-results-state') || this.container.querySelector('.no-results-state'),
      loadingState: this.container.querySelector('.loading-state'),
      taskCount: document.querySelector('[data-count="total"]'),
      activeCount: document.querySelector('[data-count="active"]'),
      completedCount: document.querySelector('[data-count="completed"]')
    };

    if (!this.elements.list) {
      throw new Error('Task list element not found');
    }
  }

  // === EVENT LISTENERS === */
  attachEventListeners() {
    // List-level events (using event delegation)
    this.addListener(this.elements.list, 'click', this.handleListClick.bind(this));
    this.addListener(this.elements.list, 'keydown', this.handleListKeydown.bind(this));
    
    // Custom events from task items
    this.addListener(this.elements.list, EVENTS.TASK_UPDATED, this.handleTaskUpdated.bind(this));
    this.addListener(this.elements.list, EVENTS.TASK_DELETED, this.handleTaskDeleted.bind(this));
    this.addListener(this.elements.list, EVENTS.TASK_EDIT_START, this.handleTaskEditStart.bind(this));
    this.addListener(this.elements.list, EVENTS.TASK_EDIT_CANCEL, this.handleTaskEditEnd.bind(this));
    
    // Scroll events for virtual scrolling
    if (this.options.enableVirtualScrolling) {
      this.addListener(this.elements.list, 'scroll', this.handleScroll.bind(this));
    }
    
    // Clear completed button
    const clearCompletedBtn = document.querySelector('[data-action="clear-completed"]');
    if (clearCompletedBtn) {
      this.addListener(clearCompletedBtn, 'click', this.handleClearCompleted.bind(this));
    }
    
    // Task creation events - force refresh when tasks are created
    this.addListener(document, EVENTS.TASK_CREATED, this.handleTaskCreated.bind(this));
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  subscribeToStateChanges() {
    // Subscribe to state changes
    this.unsubscribeFromState = this.state.subscribe((newState, prevState, source) => {
      // Re-render when tasks or filters change
      if (newState.tasks !== prevState.tasks || 
          newState.filters !== prevState.filters) {
        this.debouncedRender();
      }
      
      // Update counts
      this.updateTaskCounts(newState.statistics);
    });
  }

  // === DATA MANAGEMENT === */
  async loadTasks() {
    try {
      this.showLoading(true);
      
      // Get filtered tasks from state
      const tasks = this.state.getFilteredTasks();
      
      // Sort tasks
      const sortedTasks = this.taskManager.sortTasks(
        tasks, 
        this.options.sortBy, 
        this.options.sortDirection
      );
      
      this.currentTasks = sortedTasks;
      this.render();
      
    } catch (error) {
      logError(error, 'TaskList.loadTasks');
      this.handleError(error, 'Failed to load tasks');
    } finally {
      this.showLoading(false);
    }
  }

  // Force refresh from task manager data
  forceRefresh() {
    try {
      // Get all tasks directly from task manager
      const allTasks = this.taskManager.getAllTasks();
      
      // Apply current filters manually
      const currentFilters = this.state.getState().filters;
      let filteredTasks = allTasks.filter(task => {
        // Status filter
        if (currentFilters.status === 'active' && task.completed) return false;
        if (currentFilters.status === 'completed' && !task.completed) return false;
        
        // Priority filter
        if (currentFilters.priority !== 'all' && task.priority !== currentFilters.priority) return false;
        
        // Search filter
        if (currentFilters.searchQuery) {
          const query = currentFilters.searchQuery.toLowerCase();
          if (!task.title.toLowerCase().includes(query)) return false;
        }
        
        return true;
      });
      
      // Sort tasks
      const sortedTasks = this.taskManager.sortTasks(
        filteredTasks, 
        this.options.sortBy, 
        this.options.sortDirection
      );
      
      this.currentTasks = sortedTasks;
      this.render();
      
    } catch (error) {
      logError(error, 'TaskList.forceRefresh');
      this.loadTasks(); // Fallback to normal load
    }
  }

  // === RENDERING === */
  render() {
    try {
      const visibleTasks = this.getVisibleTasks();
      
      // Clear existing items
      this.clearTaskItems();
      
      if (visibleTasks.length === 0) {
        this.showEmptyState();
      } else {
        this.hideEmptyState();
        this.renderTasks(visibleTasks);
      }
      
      // Update counts and accessibility
      this.updateTaskCounts();
      this.updateAccessibility();
      
      emit(this.container, EVENTS.COMPONENT_UPDATED, {
        component: 'TaskList',
        taskCount: visibleTasks.length,
        totalTasks: this.currentTasks.length
      });

    } catch (error) {
      logError(error, 'TaskList.render');
      this.handleError(error, 'Failed to render task list');
    }
  }

  getVisibleTasks() {
    if (!this.options.enableVirtualScrolling) {
      return this.currentTasks;
    }
    
    // Virtual scrolling: only render visible items
    const startIndex = this.currentPage * this.options.itemsPerPage;
    const endIndex = startIndex + this.options.itemsPerPage;
    
    return this.currentTasks.slice(startIndex, endIndex);
  }

  renderTasks(tasks) {
    const fragment = document.createDocumentFragment();
    
    tasks.forEach((task, index) => {
      try {
        const taskItem = this.createTaskItem(task, index);
        fragment.appendChild(taskItem.getElement());
      } catch (error) {
        logError(error, `Failed to render task: ${task.id}`);
        // Continue rendering other tasks
      }
    });
    
    this.elements.list.appendChild(fragment);
    
    // Announce to screen readers
    const taskCount = tasks.length;
    if (taskCount > 0) {
      announceToScreenReader(`Task list updated. ${taskCount} task${taskCount !== 1 ? 's' : ''} displayed.`);
    }
  }

  createTaskItem(task, index) {
    const taskItem = new TaskItem(task, {
      enableEdit: true,
      enableDelete: true,
      enablePriorityDisplay: true,
      enableTimestamps: true,
      confirmDelete: this.state.getState().settings.confirmDeletion,
      showCompletionAnimation: this.options.animateChanges
    });
    
    // Store reference
    this.taskItems.set(task.id, taskItem);
    
    // Add tabindex for keyboard navigation
    if (this.options.enableKeyboardNavigation) {
      const element = taskItem.getElement();
      element.setAttribute('tabindex', index === 0 ? '0' : '-1');
      element.setAttribute('data-index', index);
    }
    
    return taskItem;
  }

  clearTaskItems() {
    // Destroy existing task items
    this.taskItems.forEach(taskItem => {
      taskItem.destroy();
    });
    this.taskItems.clear();
    
    // Clear DOM
    this.elements.list.innerHTML = '';
  }

  // === EMPTY STATES === */
  showEmptyState() {
    if (!this.options.enableEmptyState) return;
    
    const hasActiveFilters = this.hasActiveFilters();
    
    if (hasActiveFilters) {
      this.showNoResultsState();
    } else {
      this.showNoTasksState();
    }
  }

  hideEmptyState() {
    if (this.elements.emptyState) {
      this.elements.emptyState.setAttribute('aria-hidden', 'true');
      this.elements.emptyState.style.display = 'none';
    }
    
    if (this.elements.noResultsState) {
      this.elements.noResultsState.setAttribute('aria-hidden', 'true');
      this.elements.noResultsState.style.display = 'none';
    }
  }

  showNoTasksState() {
    if (this.elements.emptyState) {
      this.elements.emptyState.setAttribute('aria-hidden', 'false');
      this.elements.emptyState.style.display = 'block';
      
      announceToScreenReader('No tasks found. Add your first task to get started.');
    }
  }

  showNoResultsState() {
    if (this.elements.noResultsState && this.options.enableNoResultsState) {
      this.elements.noResultsState.setAttribute('aria-hidden', 'false');
      this.elements.noResultsState.style.display = 'block';
      
      announceToScreenReader('No tasks match your current search or filters.');
    }
  }

  hasActiveFilters() {
    const filters = this.state.getState().filters;
    return filters.status !== 'all' || 
           filters.priority !== 'all' || 
           filters.searchQuery.length > 0;
  }

  // === LOADING STATE === */
  showLoading(show) {
    if (this.elements.loadingState) {
      this.elements.loadingState.style.display = show ? 'block' : 'none';
      this.elements.loadingState.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
    
    this.elements.list.setAttribute('aria-busy', show);
  }

  // === EVENT HANDLERS === */
  handleListClick(event) {
    // Event delegation is handled by individual TaskItem components
    // This is here for any list-level click handling if needed
  }

  handleListKeydown(event) {
    if (!this.options.enableKeyboardNavigation) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPrevious();
        break;
      case 'Home':
        event.preventDefault();
        this.focusFirst();
        break;
      case 'End':
        event.preventDefault();
        this.focusLast();
        break;
      case 'Enter':
      case ' ':
        if (event.target.classList.contains('task-item')) {
          event.preventDefault();
          const checkbox = event.target.querySelector('.task-item__checkbox');
          if (checkbox) {
            checkbox.click();
          }
        }
        break;
    }
  }

  handleTaskUpdated(event) {
    const { task } = event.detail;
    
    // Update task in our current list
    const index = this.currentTasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      this.currentTasks[index] = task;
    }
    
    // Re-render if sorting might have changed
    if (this.options.sortBy === 'updatedAt' || this.options.sortBy === 'completed') {
      this.debouncedRender();
    } else {
      // Just update the specific item
      const taskItem = this.taskItems.get(task.id);
      if (taskItem) {
        taskItem.update(task);
      }
    }
  }

  handleTaskDeleted(event) {
    const { task, element } = event.detail;
    
    // Remove from our current list
    this.currentTasks = this.currentTasks.filter(t => t.id !== task.id);
    
    // Remove task item
    const taskItem = this.taskItems.get(task.id);
    if (taskItem) {
      this.taskItems.delete(task.id);
      // TaskItem handles its own cleanup
    }
    
    // Update focus if necessary
    this.updateFocusAfterDeletion(element);
    
    // Re-render if list is now empty
    if (this.currentTasks.length === 0) {
      this.render();
    }
  }

  handleTaskEditStart(event) {
    // Disable keyboard navigation during edit
    this.elements.list.setAttribute('aria-activedescendant', '');
  }

  handleTaskEditEnd(event) {
    // Re-enable keyboard navigation
    this.updateAccessibility();
  }

  async handleClearCompleted(event) {
    try {
      const completedTasks = this.currentTasks.filter(task => task.completed);
      
      if (completedTasks.length === 0) {
        announceToScreenReader('No completed tasks to clear.');
        return;
      }
      
      // Confirm action if enabled
      if (this.state.getState().settings.confirmDeletion) {
        const confirmed = await this.showClearCompletedConfirmation(completedTasks.length);
        if (!confirmed) return;
      }
      
      await this.taskManager.clearCompletedTasks();
      
      announceToScreenReader(`${completedTasks.length} completed task${completedTasks.length !== 1 ? 's' : ''} cleared.`);
      
    } catch (error) {
      logError(error, 'TaskList.handleClearCompleted');
      this.handleError(error, 'Failed to clear completed tasks');
    }
  }

  handleScroll(event) {
    if (!this.options.enableVirtualScrolling) return;
    
    // Calculate which page should be visible
    const scrollTop = this.elements.list.scrollTop;
    const itemHeight = 80; // Approximate item height
    const newPage = Math.floor(scrollTop / (itemHeight * this.options.itemsPerPage));
    
    if (newPage !== this.currentPage) {
      this.currentPage = newPage;
      this.render();
    }
  }

  handleTaskCreated(event) {
    // Force refresh when a new task is created to ensure immediate display
    console.log('TaskList received TASK_CREATED event:', event.detail);
    this.forceRefresh();
  }

  // === KEYBOARD NAVIGATION === */
  focusNext() {
    const items = this.elements.list.querySelectorAll('.task-item');
    if (items.length === 0) return;
    
    this.focusedIndex = Math.min(this.focusedIndex + 1, items.length - 1);
    this.updateFocus();
  }

  focusPrevious() {
    const items = this.elements.list.querySelectorAll('.task-item');
    if (items.length === 0) return;
    
    this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
    this.updateFocus();
  }

  focusFirst() {
    const items = this.elements.list.querySelectorAll('.task-item');
    if (items.length === 0) return;
    
    this.focusedIndex = 0;
    this.updateFocus();
  }

  focusLast() {
    const items = this.elements.list.querySelectorAll('.task-item');
    if (items.length === 0) return;
    
    this.focusedIndex = items.length - 1;
    this.updateFocus();
  }

  updateFocus() {
    const items = this.elements.list.querySelectorAll('.task-item');
    
    items.forEach((item, index) => {
      if (index === this.focusedIndex) {
        item.setAttribute('tabindex', '0');
        item.focus();
      } else {
        item.setAttribute('tabindex', '-1');
      }
    });
  }

  updateFocusAfterDeletion(deletedElement) {
    const items = this.elements.list.querySelectorAll('.task-item');
    
    if (items.length === 0) {
      this.focusedIndex = -1;
      return;
    }
    
    // Focus the next item, or the last item if we deleted the last one
    this.focusedIndex = Math.min(this.focusedIndex, items.length - 1);
    this.updateFocus();
  }

  // === TASK COUNTS === */
  updateTaskCounts(statistics) {
    const stats = statistics || this.taskManager.getTaskStatistics();
    
    if (this.elements.taskCount) {
      this.elements.taskCount.textContent = stats.total;
    }
    
    if (this.elements.activeCount) {
      this.elements.activeCount.textContent = stats.active;
    }
    
    if (this.elements.completedCount) {
      this.elements.completedCount.textContent = stats.completed;
    }
    
    // Update filter button counts
    const filterCounts = document.querySelectorAll('.filter-count');
    filterCounts.forEach(countElement => {
      const countType = countElement.getAttribute('data-count');
      if (countType && stats[countType] !== undefined) {
        countElement.textContent = stats[countType];
      }
    });
  }

  // === ACCESSIBILITY === */
  updateAccessibility() {
    const taskCount = this.currentTasks.length;
    
    this.elements.list.setAttribute('aria-label', 
      `Task list with ${taskCount} task${taskCount !== 1 ? 's' : ''}`
    );
    
    if (taskCount > 0 && this.focusedIndex === -1) {
      this.focusedIndex = 0;
      this.updateFocus();
    }
  }

  // === CONFIRMATION DIALOGS === */
  async showClearCompletedConfirmation(count) {
    return new Promise((resolve) => {
      emit(document, EVENTS.MODAL_OPEN, {
        type: 'confirm',
        title: 'Clear Completed Tasks',
        message: `Are you sure you want to delete ${count} completed task${count !== 1 ? 's' : ''}?`,
        confirmText: 'Clear',
        cancelText: 'Cancel',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }

  // === PUBLIC API === */
  refresh() {
    this.loadTasks();
  }

  setSortOrder(sortBy, direction) {
    this.options.sortBy = sortBy;
    this.options.sortDirection = direction;
    this.loadTasks();
  }

  getTaskCount() {
    return this.currentTasks.length;
  }

  getVisibleTaskCount() {
    return this.taskItems.size;
  }

  focusTask(taskId) {
    const taskItem = this.taskItems.get(taskId);
    if (taskItem) {
      taskItem.focus();
    }
  }

  getContainer() {
    return this.container;
  }

  // === ERROR HANDLING === */
  handleError(error, userMessage) {
    emit(document, EVENTS.APP_ERROR, {
      error,
      context: 'TaskList',
      userMessage,
      timestamp: new Date().toISOString()
    });

    // Show error state in list
    this.elements.list.innerHTML = `
      <li class="task-list__error" role="alert">
        <div class="error-message">
          <strong>Error:</strong> ${userMessage || 'Failed to load tasks'}
        </div>
        <button type="button" class="btn btn--secondary" onclick="this.closest('.task-list').dispatchEvent(new CustomEvent('reload'))">
          Try Again
        </button>
      </li>
    `;
    
    // Listen for reload
    this.addListener(this.elements.list, 'reload', () => {
      this.loadTasks();
    });
  }

  // === CLEANUP === */
  destroy() {
    // Unsubscribe from state
    if (this.unsubscribeFromState) {
      this.unsubscribeFromState();
    }

    // Clear all task items
    this.clearTaskItems();

    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    // Clear data
    this.currentTasks = [];
    this.focusedIndex = -1;

    emit(document, EVENTS.COMPONENT_UNMOUNTED, {
      component: 'TaskList',
      container: this.container
    });
  }
}

// === FACTORY FUNCTION === */
export function createTaskList(container, options) {
  return new TaskList(container, options);
}

// === AUTO-INITIALIZATION === */
export function initTaskLists(selector = '.task-list-section') {
  const containers = document.querySelectorAll(selector);
  const taskLists = [];
  
  containers.forEach(container => {
    try {
      const taskList = new TaskList(container);
      taskLists.push(taskList);
    } catch (error) {
      logError(error, `Failed to initialize TaskList in container: ${container}`);
    }
  });
  
  return taskLists;
}