/* Filter Component */

import { EVENTS } from '../constants/events.js';
import { SELECTORS, FILTERS } from '../constants/selectors.js';
import { on, off, emit, logError, announceToScreenReader } from '../utils/helpers.js';
import { validateFilters } from '../utils/validation.js';
import { getStateManager } from '../modules/stateManager.js';
import { getTaskManager } from '../modules/taskManager.js';

// === FILTER COMPONENT === */
export class Filter {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      enableStatusFilter: true,
      enablePriorityFilter: true,
      showFilterCounts: true,
      announceChanges: true,
      allowMultipleSelection: false,
      persistFilters: true,
      ...options
    };

    this.state = getStateManager();
    this.taskManager = getTaskManager();
    this.elements = {};
    this.listeners = [];
    this.currentFilters = {
      status: 'all',
      priority: 'all'
    };
    
    this.init();
  }

  // === INITIALIZATION === */
  init() {
    try {
      if (!this.container) {
        throw new Error('Filter container not found');
      }

      this.findElements();
      this.attachEventListeners();
      this.subscribeToStateChanges();
      this.updateDisplay();

      emit(document, EVENTS.COMPONENT_MOUNTED, {
        component: 'Filter',
        container: this.container
      });

    } catch (error) {
      logError(error, 'Filter.init');
      this.handleError(error, 'Failed to initialize filter');
    }
  }

  // === DOM ELEMENT DISCOVERY === */
  findElements() {
    this.elements = {
      // Status filter elements
      statusSection: this.container.querySelector('[aria-labelledby="status-filter-heading"]'),
      statusButtons: this.container.querySelectorAll('[data-filter="all"], [data-filter="active"], [data-filter="completed"]'),
      
      // Priority filter elements
      prioritySection: this.container.querySelector('[aria-labelledby="priority-filter-heading"]'),
      priorityButtons: this.container.querySelectorAll('[data-filter="all-priority"], [data-filter="high"], [data-filter="medium"], [data-filter="low"]'),
      
      // Clear filters button
      clearButton: this.container.querySelector('[data-action="clear-filters"]'),
      
      // Filter counts
      filterCounts: this.container.querySelectorAll('.filter-count'),
      
      // Individual count elements
      allCount: this.container.querySelector('[data-count="all"]'),
      activeCount: this.container.querySelector('[data-count="active"]'),
      completedCount: this.container.querySelector('[data-count="completed"]')
    };

    // Group filter buttons by type
    this.statusFilterButtons = Array.from(this.elements.statusButtons);
    this.priorityFilterButtons = Array.from(this.elements.priorityButtons);
  }

  // === EVENT LISTENERS === */
  attachEventListeners() {
    // Status filter buttons
    this.statusFilterButtons.forEach(button => {
      this.addListener(button, 'click', this.handleStatusFilterClick.bind(this));
    });

    // Priority filter buttons  
    this.priorityFilterButtons.forEach(button => {
      this.addListener(button, 'click', this.handlePriorityFilterClick.bind(this));
    });

    // Clear filters button
    if (this.elements.clearButton) {
      this.addListener(this.elements.clearButton, 'click', this.handleClearFilters.bind(this));
    }

    // Global keyboard shortcuts
    this.addListener(document, 'keydown', this.handleKeyboardShortcuts.bind(this));

    // Global filter events
    this.addListener(document, EVENTS.FILTER_CLEARED, this.handleFiltersCleared.bind(this));
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  subscribeToStateChanges() {
    // Subscribe to state changes to update UI
    this.unsubscribeFromState = this.state.subscribe((newState, prevState, source) => {
      // Update filters if changed externally
      if (newState.filters !== prevState.filters) {
        this.syncWithState(newState.filters);
      }
      
      // Update filter counts when tasks change
      if (newState.tasks !== prevState.tasks || newState.filters !== prevState.filters) {
        this.updateFilterCounts();
      }
    });
  }

  // === EVENT HANDLERS === */
  handleStatusFilterClick(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const filterValue = button.getAttribute('data-filter');
    
    if (!filterValue) return;
    
    this.setStatusFilter(filterValue);
  }

  handlePriorityFilterClick(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const filterValue = button.getAttribute('data-filter');
    
    if (!filterValue) return;
    
    // Convert 'all-priority' to 'all'
    const priorityValue = filterValue === 'all-priority' ? 'all' : filterValue;
    this.setPriorityFilter(priorityValue);
  }

  handleClearFilters(event) {
    event.preventDefault();
    this.clearAllFilters();
  }

  handleKeyboardShortcuts(event) {
    // Handle filter keyboard shortcuts
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    const { key, ctrlKey, metaKey, altKey } = event;
    const modifier = ctrlKey || metaKey;

    // Filter shortcuts (Alt + number)
    if (altKey && !modifier) {
      switch (key) {
        case '1':
          event.preventDefault();
          this.setStatusFilter('all');
          break;
        case '2':
          event.preventDefault();
          this.setStatusFilter('active');
          break;
        case '3':
          event.preventDefault();
          this.setStatusFilter('completed');
          break;
        case '0':
          event.preventDefault();
          this.clearAllFilters();
          break;
      }
    }
  }

  handleFiltersCleared(event) {
    this.syncWithState({
      status: 'all',
      priority: 'all',
      searchQuery: ''
    });
  }

  // === FILTER OPERATIONS === */
  setStatusFilter(status) {
    if (!this.options.enableStatusFilter) return;
    
    const validStatuses = ['all', 'active', 'completed'];
    if (!validStatuses.includes(status)) {
      console.warn(`Invalid status filter: ${status}`);
      return;
    }

    // Update current filters
    this.currentFilters.status = status;
    
    // Update state
    this.state.setFilter('status', status);
    
    // Update UI
    this.updateStatusButtons(status);
    
    // Announce change
    if (this.options.announceChanges) {
      const statusText = status === 'all' ? 'all tasks' : `${status} tasks`;
      announceToScreenReader(`Showing ${statusText}`);
    }
    
    // Emit event
    emit(this.container, EVENTS.FILTER_STATUS_CHANGED, {
      status,
      filters: this.currentFilters
    });
  }

  setPriorityFilter(priority) {
    if (!this.options.enablePriorityFilter) return;
    
    const validPriorities = ['all', 'low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      console.warn(`Invalid priority filter: ${priority}`);
      return;
    }

    // Update current filters
    this.currentFilters.priority = priority;
    
    // Update state
    this.state.setFilter('priority', priority);
    
    // Update UI
    this.updatePriorityButtons(priority);
    
    // Announce change
    if (this.options.announceChanges) {
      const priorityText = priority === 'all' ? 'all priorities' : `${priority} priority tasks`;
      announceToScreenReader(`Showing ${priorityText}`);
    }
    
    // Emit event
    emit(this.container, EVENTS.FILTER_PRIORITY_CHANGED, {
      priority,
      filters: this.currentFilters
    });
  }

  clearAllFilters() {
    // Reset to default filters
    this.currentFilters = {
      status: 'all',
      priority: 'all'
    };
    
    // Clear filters in state
    this.state.clearFilters();
    
    // Update UI
    this.updateAllButtons();
    
    // Announce change
    if (this.options.announceChanges) {
      announceToScreenReader('All filters cleared, showing all tasks');
    }
    
    // Emit event
    emit(document, EVENTS.FILTER_CLEARED, {
      filters: this.currentFilters
    });
    
    emit(this.container, EVENTS.FILTER_CLEARED, {
      filters: this.currentFilters
    });
  }

  // === UI UPDATES === */
  updateStatusButtons(activeStatus) {
    this.statusFilterButtons.forEach(button => {
      const filterValue = button.getAttribute('data-filter');
      const isActive = filterValue === activeStatus;
      
      // Update visual state
      button.classList.toggle('btn--filter-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      
      // Update accessibility
      if (isActive) {
        button.setAttribute('aria-current', 'true');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  }

  updatePriorityButtons(activePriority) {
    this.priorityFilterButtons.forEach(button => {
      const filterValue = button.getAttribute('data-filter');
      // Handle 'all-priority' mapping to 'all'
      const priorityValue = filterValue === 'all-priority' ? 'all' : filterValue;
      const isActive = priorityValue === activePriority;
      
      // Update visual state
      button.classList.toggle('btn--filter-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      
      // Update accessibility
      if (isActive) {
        button.setAttribute('aria-current', 'true');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  }

  updateAllButtons() {
    this.updateStatusButtons(this.currentFilters.status);
    this.updatePriorityButtons(this.currentFilters.priority);
  }

  updateFilterCounts() {
    if (!this.options.showFilterCounts) return;

    try {
      const taskStats = this.taskManager.getTaskStatistics();
      
      // Update individual count elements
      if (this.elements.allCount) {
        this.elements.allCount.textContent = taskStats.total;
      }
      
      if (this.elements.activeCount) {
        this.elements.activeCount.textContent = taskStats.active;
      }
      
      if (this.elements.completedCount) {
        this.elements.completedCount.textContent = taskStats.completed;
      }
      
      // Update all filter count elements
      this.elements.filterCounts.forEach(countElement => {
        const countType = countElement.getAttribute('data-count');
        
        switch (countType) {
          case 'all':
            countElement.textContent = taskStats.total;
            break;
          case 'active':
            countElement.textContent = taskStats.active;
            break;
          case 'completed':
            countElement.textContent = taskStats.completed;
            break;
        }
      });
      
      // Update filter button states based on counts
      this.updateButtonStates(taskStats);
      
    } catch (error) {
      logError(error, 'Filter.updateFilterCounts');
    }
  }

  updateButtonStates(taskStats) {
    // Disable buttons if no tasks in that category
    this.statusFilterButtons.forEach(button => {
      const filterValue = button.getAttribute('data-filter');
      let disabled = false;
      
      switch (filterValue) {
        case 'active':
          disabled = taskStats.active === 0;
          break;
        case 'completed':
          disabled = taskStats.completed === 0;
          break;
        case 'all':
        default:
          disabled = taskStats.total === 0;
          break;
      }
      
      button.disabled = disabled;
      button.classList.toggle('btn--disabled', disabled);
      
      if (disabled) {
        button.setAttribute('aria-disabled', 'true');
      } else {
        button.removeAttribute('aria-disabled');
      }
    });
  }

  syncWithState(filters) {
    // Update current filters
    this.currentFilters = {
      status: filters.status || 'all',
      priority: filters.priority || 'all'
    };
    
    // Update UI
    this.updateAllButtons();
  }

  updateDisplay() {
    // Sync with current state
    const currentState = this.state.getState();
    this.syncWithState(currentState.filters);
    this.updateFilterCounts();
  }

  // === FILTER PRESETS === */
  applyPreset(presetName) {
    const presets = {
      'today': {
        status: 'active',
        priority: 'all'
      },
      'high-priority': {
        status: 'active', 
        priority: 'high'
      },
      'completed': {
        status: 'completed',
        priority: 'all'
      },
      'all': {
        status: 'all',
        priority: 'all'
      }
    };
    
    const preset = presets[presetName];
    if (!preset) {
      console.warn(`Unknown filter preset: ${presetName}`);
      return;
    }
    
    // Apply preset filters
    this.setStatusFilter(preset.status);
    this.setPriorityFilter(preset.priority);
    
    if (this.options.announceChanges) {
      announceToScreenReader(`Applied ${presetName} filter preset`);
    }
  }

  // === VALIDATION === */
  validateFilters(filters) {
    return validateFilters(filters);
  }

  // === PUBLIC API === */
  getActiveFilters() {
    return { ...this.currentFilters };
  }

  setFilters(filters) {
    const validation = this.validateFilters(filters);
    if (!validation.isValid) {
      console.error('Invalid filters:', validation.errors);
      return false;
    }
    
    const sanitizedFilters = validation.sanitizedValue;
    
    if (sanitizedFilters.status) {
      this.setStatusFilter(sanitizedFilters.status);
    }
    
    if (sanitizedFilters.priority) {
      this.setPriorityFilter(sanitizedFilters.priority);
    }
    
    return true;
  }

  hasActiveFilters() {
    return this.currentFilters.status !== 'all' || 
           this.currentFilters.priority !== 'all';
  }

  getFilteredTaskCount() {
    return this.state.getFilteredTasks().length;
  }

  getContainer() {
    return this.container;
  }

  // === PERSISTENCE === */
  saveFilters() {
    if (!this.options.persistFilters) return;
    
    try {
      const filterData = {
        ...this.currentFilters,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('todoapp_active_filters', JSON.stringify(filterData));
    } catch (error) {
      console.warn('Failed to save filters:', error);
    }
  }

  loadSavedFilters() {
    if (!this.options.persistFilters) return null;
    
    try {
      const saved = localStorage.getItem('todoapp_active_filters');
      if (!saved) return null;
      
      const filterData = JSON.parse(saved);
      
      // Validate that saved filters are still valid
      const validation = this.validateFilters(filterData);
      if (validation.isValid) {
        return validation.sanitizedValue;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to load saved filters:', error);
      return null;
    }
  }

  // === ANALYTICS === */
  getFilterUsageStats() {
    // Placeholder for future analytics
    return {
      statusFilterUsage: {
        all: 0,
        active: 0,
        completed: 0
      },
      priorityFilterUsage: {
        all: 0,
        low: 0,
        medium: 0,
        high: 0
      },
      mostUsedCombination: null,
      totalFilterChanges: 0
    };
  }

  // === ERROR HANDLING === */
  handleError(error, userMessage) {
    emit(document, EVENTS.APP_ERROR, {
      error,
      context: 'Filter',
      userMessage,
      timestamp: new Date().toISOString()
    });

    // Show user-friendly notification
    this.state.showNotification(
      userMessage || 'Filter encountered an error',
      'error',
      { autoHide: true, duration: 3000 }
    );
  }

  // === CLEANUP === */
  destroy() {
    // Save current filters before destroying
    this.saveFilters();
    
    // Unsubscribe from state
    if (this.unsubscribeFromState) {
      this.unsubscribeFromState();
    }

    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    // Reset filters
    this.currentFilters = {
      status: 'all',
      priority: 'all'
    };

    emit(document, EVENTS.COMPONENT_UNMOUNTED, {
      component: 'Filter',
      container: this.container
    });
  }
}

// === FACTORY FUNCTION === */
export function createFilter(container, options) {
  return new Filter(container, options);
}

// === AUTO-INITIALIZATION === */
export function initFilterComponents(selector = '.sidebar') {
  const containers = document.querySelectorAll(selector);
  const filterComponents = [];
  
  containers.forEach(container => {
    try {
      const filter = new Filter(container);
      filterComponents.push(filter);
    } catch (error) {
      logError(error, `Failed to initialize Filter in container: ${container}`);
    }
  });
  
  return filterComponents;
}

// === FILTER UTILITIES === */
export class FilterUtils {
  static getFilterDisplayName(filterType, filterValue) {
    const displayNames = {
      status: {
        all: 'All Tasks',
        active: 'Active Tasks', 
        completed: 'Completed Tasks'
      },
      priority: {
        all: 'All Priorities',
        low: 'Low Priority',
        medium: 'Medium Priority',
        high: 'High Priority'
      }
    };
    
    return displayNames[filterType]?.[filterValue] || filterValue;
  }
  
  static getFilterIcon(filterType, filterValue) {
    const icons = {
      status: {
        all: '📋',
        active: '⏳',
        completed: '✅'
      },
      priority: {
        all: '🏷️',
        low: '🟢',
        medium: '🟡',
        high: '🔴'
      }
    };
    
    return icons[filterType]?.[filterValue] || '';
  }
  
  static combineFilters(filter1, filter2) {
    return {
      ...filter1,
      ...filter2
    };
  }
  
  static isFilterActive(filters, filterType, filterValue) {
    return filters[filterType] === filterValue;
  }
}