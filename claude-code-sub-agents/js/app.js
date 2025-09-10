/* Main Application Entry Point */

import { EVENTS } from './constants/events.js';
import { SELECTORS } from './constants/selectors.js';
import { getTaskManager } from './modules/taskManager.js';
import { getStateManager } from './modules/stateManager.js';
import { getStorageService } from './modules/storage.js';
import { TaskForm } from './components/TaskForm.js';
import { TaskList } from './components/TaskList.js';
import { Filter } from './components/Filter.js';
import { Search } from './components/Search.js';
import { logError, emit, announceToScreenReader, trapFocus } from './utils/helpers.js';

// === MAIN APPLICATION CLASS === */
export class App {
  constructor() {
    this.components = new Map();
    this.listeners = [];
    this.isInitialized = false;
    this.isDestroyed = false;
    
    // Get core services
    this.taskManager = getTaskManager();
    this.state = getStateManager();
    this.storage = getStorageService();
    
    // Bind methods
    this.handleAppError = this.handleAppError.bind(this);
    this.handleKeyboardShortcuts = this.handleKeyboardShortcuts.bind(this);
    this.handleThemeToggle = this.handleThemeToggle.bind(this);
    this.handleSidebarToggle = this.handleSidebarToggle.bind(this);
    this.handleModalActions = this.handleModalActions.bind(this);
    this.handleExportTasks = this.handleExportTasks.bind(this);
  }

  // === INITIALIZATION === */
  async init() {
    try {
      console.log('Initializing Todo List MVP...');
      
      // Show loading state
      this.showLoadingState();
      
      // Initialize core services first
      await this.initializeServices();
      
      // Initialize UI components
      await this.initializeComponents();
      
      // Set up global event listeners
      this.setupGlobalEventListeners();
      
      // Load initial data and state
      await this.loadInitialState();
      
      // Hide loading state
      this.hideLoadingState();
      
      // Mark as initialized
      this.isInitialized = true;
      
      // Announce to screen reader
      announceToScreenReader('Todo List application loaded successfully');
      
      // Emit ready event
      emit(document, EVENTS.APP_READY, {
        timestamp: new Date().toISOString(),
        components: Array.from(this.components.keys())
      });
      
      console.log('Todo List MVP initialized successfully');
      
    } catch (error) {
      logError(error, 'App.init');
      this.handleInitializationError(error);
    }
  }

  async initializeServices() {
    try {
      // Wait for task manager to be ready
      if (!this.taskManager.isReady()) {
        await new Promise(resolve => {
          const checkReady = () => {
            if (this.taskManager.isReady()) {
              resolve();
            } else {
              setTimeout(checkReady, 10);
            }
          };
          checkReady();
        });
      }
      
      emit(document, EVENTS.APP_INIT, {
        stage: 'services',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      throw new Error(`Failed to initialize services: ${error.message}`);
    }
  }

  async initializeComponents() {
    try {
      // Initialize TaskForm
      const taskFormContainer = document.querySelector('.task-form-section');
      if (taskFormContainer) {
        const taskForm = new TaskForm(taskFormContainer, {
          autoFocus: true,
          showSuccessMessage: true
        });
        this.components.set('taskForm', taskForm);
      }

      // Initialize TaskList
      const taskListContainer = document.querySelector('.task-list-section');
      if (taskListContainer) {
        const taskList = new TaskList(taskListContainer, {
          enableKeyboardNavigation: true,
          animateChanges: true
        });
        this.components.set('taskList', taskList);
      }

      // Initialize Search
      const searchContainer = document.querySelector('.search-bar') || document.querySelector('#search-input')?.parentElement;
      if (searchContainer) {
        const search = new Search(searchContainer);
        this.components.set('search', search);
      } else {
        console.warn('Search container not found - search functionality will not be available');
      }

      // Initialize Filter 
      const filterContainer = document.querySelector('.filter-controls') || document.querySelector('.sidebar') || document.querySelector('.filter-buttons')?.parentElement;
      if (filterContainer) {
        const filter = new Filter(filterContainer);
        this.components.set('filter', filter);
      } else {
        console.warn('Filter container not found - filter functionality will not be available');
      }

      emit(document, EVENTS.APP_INIT, {
        stage: 'components',
        timestamp: new Date().toISOString(),
        componentCount: this.components.size
      });

    } catch (error) {
      throw new Error(`Failed to initialize components: ${error.message}`);
    }
  }

  setupGlobalEventListeners() {
    // Global error handling
    this.addListener(document, EVENTS.APP_ERROR, this.handleAppError);
    
    // Keyboard shortcuts
    this.addListener(document, 'keydown', this.handleKeyboardShortcuts);
    
    // Theme toggle
    const themeToggle = document.querySelector('[data-action="toggle-theme"]');
    if (themeToggle) {
      this.addListener(themeToggle, 'click', this.handleThemeToggle);
    }
    
    // Sidebar toggle
    const sidebarToggle = document.querySelector('[data-action="toggle-sidebar"]');
    if (sidebarToggle) {
      this.addListener(sidebarToggle, 'click', this.handleSidebarToggle);
    }
    
    // Modal actions
    this.addListener(document, 'click', this.handleModalActions);
    
    // Global modal events
    this.addListener(document, EVENTS.MODAL_OPEN, this.handleModalOpen.bind(this));
    
    // Global notification events
    this.addListener(document, EVENTS.NOTIFICATION_SHOW, this.handleNotificationShow.bind(this));
    
    // Task events for ensuring UI updates
    this.addListener(document, EVENTS.TASK_CREATED, this.handleTaskCreated.bind(this));
    
    // Export tasks
    const exportButton = document.querySelector('[data-action="export-tasks"]');
    if (exportButton) {
      this.addListener(exportButton, 'click', this.handleExportTasks);
    }
    
    // Clear filters
    const clearFiltersButton = document.querySelector('[data-action="clear-filters"]');
    if (clearFiltersButton) {
      this.addListener(clearFiltersButton, 'click', () => {
        this.state.clearFilters();
        announceToScreenReader('All filters cleared');
      });
    }
    
    // Window events
    this.addListener(window, 'beforeunload', this.handleBeforeUnload.bind(this));
    this.addListener(window, 'resize', this.handleWindowResize.bind(this));
  }

  async loadInitialState() {
    try {
      // Load UI state from storage
      const savedUIState = await this.storage.loadUIState();
      
      // Apply theme
      if (savedUIState.theme) {
        this.setTheme(savedUIState.theme);
      }
      
      // Apply filters
      if (savedUIState.filters) {
        Object.entries(savedUIState.filters).forEach(([filterType, value]) => {
          this.state.setFilter(filterType, value);
        });
      }
      
      // Load settings
      const settings = await this.storage.loadSettings();
      this.state.setState({ settings }, 'app.loadInitialState');
      
    } catch (error) {
      console.warn('Failed to load initial state:', error);
      // Continue with defaults
    }
  }

  // === EVENT HANDLERS === */
  handleAppError(event) {
    const { error, context, userMessage } = event.detail;
    
    console.error(`Application Error [${context}]:`, error);
    
    // Show user-friendly notification
    this.showNotification(
      userMessage || 'Something went wrong. Please try again.',
      'error',
      { autoHide: true, duration: 5000 }
    );
    
    // Report to analytics (if implemented)
    this.reportError(error, context);
  }

  handleKeyboardShortcuts(event) {
    // Only handle shortcuts when not in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }
    
    const { key, ctrlKey, metaKey, altKey } = event;
    const modifier = ctrlKey || metaKey;
    
    switch (key) {
      case 'n':
        if (modifier) {
          event.preventDefault();
          this.focusTaskInput();
          announceToScreenReader('Focused on new task input');
        }
        break;
      case 'f':
        if (modifier) {
          event.preventDefault();
          this.focusSearch();
          announceToScreenReader('Focused on search');
        }
        break;
      case 'Escape':
        this.handleEscape();
        break;
      case '/':
        if (!modifier) {
          event.preventDefault();
          this.focusSearch();
        }
        break;
      case '?':
        if (!modifier) {
          event.preventDefault();
          this.showKeyboardShortcuts();
        }
        break;
    }
  }

  handleThemeToggle(event) {
    event.preventDefault();
    const currentTheme = this.state.getState().ui.theme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    announceToScreenReader(`Switched to ${newTheme} theme`);
  }

  handleSidebarToggle(event) {
    event.preventDefault();
    this.state.toggleSidebar();
    
    const isOpen = this.state.getState().ui.sidebarOpen;
    const sidebar = document.getElementById('sidebar');
    const toggle = event.target.closest('button');
    
    if (sidebar) {
      sidebar.classList.toggle('app__sidebar--open', isOpen);
    }
    
    if (toggle) {
      toggle.setAttribute('aria-expanded', isOpen);
    }
    
    announceToScreenReader(`Sidebar ${isOpen ? 'opened' : 'closed'}`);
  }

  handleModalActions(event) {
    const action = event.target.getAttribute('data-action');
    
    if (action === 'close-modal') {
      this.closeModal();
    }
  }

  handleModalOpen(event) {
    this.showModal(event.detail);
  }

  handleNotificationShow(event) {
    this.updateNotificationDisplay();
  }

  handleTaskCreated(event) {
    // Ensure TaskList refreshes when a task is created
    const taskList = this.components.get('taskList');
    if (taskList && taskList.forceRefresh) {
      taskList.forceRefresh();
    }
    
    console.log('App received TASK_CREATED event:', event.detail);
  }

  async handleExportTasks(event) {
    event.preventDefault();
    
    try {
      const exportData = await this.storage.exportData();
      this.downloadFile(exportData, 'todo-tasks.json', 'application/json');
      
      this.showNotification('Tasks exported successfully', 'success');
      announceToScreenReader('Tasks exported successfully');
      
    } catch (error) {
      logError(error, 'App.handleExportTasks');
      this.showNotification('Failed to export tasks', 'error');
    }
  }

  handleEscape() {
    const state = this.state.getState();
    
    if (state.ui.modalOpen) {
      this.closeModal();
    } else if (state.ui.editingTaskId) {
      this.state.setEditingTask(null);
    } else {
      // Clear search if focused
      const searchInput = document.getElementById('search-input');
      if (searchInput === document.activeElement) {
        searchInput.value = '';
        this.state.setFilter('searchQuery', '');
      }
    }
  }

  handleBeforeUnload(event) {
    // Save current state before leaving
    const state = this.state.getState();
    this.storage.saveUIState(state.ui);
    this.storage.saveSettings(state.settings);
  }

  handleWindowResize() {
    // Handle responsive behavior
    const isMobile = window.innerWidth < 768;
    if (isMobile && this.state.getState().ui.sidebarOpen) {
      this.state.toggleSidebar(); // Close sidebar on mobile
    }
  }

  // === UI HELPERS === */
  setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    this.state.setTheme(theme);
    
    // Save to storage
    this.storage.saveUIState({ theme });
    
    // Update theme toggle icon if needed
    const themeToggle = document.querySelector('[data-action="toggle-theme"]');
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', 
        theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
      );
    }
  }

  showNotification(message, type = 'info', options = {}) {
    this.state.showNotification(message, type, options);
    this.updateNotificationDisplay();
  }

  updateNotificationDisplay() {
    const notification = this.state.getState().ui.notification;
    const container = document.querySelector('.notification-container');
    
    if (!container) return;
    
    if (notification.visible) {
      container.innerHTML = `
        <div class="notification notification--${notification.type}" role="alert" aria-live="polite">
          <div class="notification__content">
            <span class="notification__message">${notification.message}</span>
            <button type="button" class="notification__close btn btn--icon" aria-label="Close notification">
              <svg class="icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
      `;
      
      // Add close handler
      const closeButton = container.querySelector('.notification__close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          this.state.hideNotification();
          container.innerHTML = '';
        });
      }
    } else {
      container.innerHTML = '';
    }
  }

  closeModal() {
    this.state.closeModal();
    const modal = document.getElementById('modal');
    if (modal) {
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';
      
      // Remove any modal event listeners
      modal.innerHTML = modal.innerHTML.replace(/onclick="[^"]*"/g, '');
    }
  }

  showModal(modalData) {
    const modal = document.getElementById('modal');
    if (!modal) return;

    const { type, title, message, confirmText = 'OK', cancelText = 'Cancel', onConfirm, onCancel } = modalData;

    // Set modal content
    const modalTitle = modal.querySelector('#modal-title');
    const modalBody = modal.querySelector('#modal-description');
    const modalFooter = modal.querySelector('.modal__footer');

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.textContent = message;

    // Clear and set footer
    if (modalFooter) {
      modalFooter.innerHTML = '';
      
      if (type === 'confirm') {
        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn--secondary';
        cancelBtn.textContent = cancelText;
        cancelBtn.onclick = () => {
          this.closeModal();
          if (onCancel) onCancel();
        };
        modalFooter.appendChild(cancelBtn);

        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = `btn btn--primary ${modalData.confirmClass || ''}`;
        confirmBtn.textContent = confirmText;
        confirmBtn.onclick = () => {
          this.closeModal();
          if (onConfirm) onConfirm();
        };
        modalFooter.appendChild(confirmBtn);
      } else {
        // Single OK button
        const okBtn = document.createElement('button');
        okBtn.type = 'button';
        okBtn.className = 'btn btn--primary';
        okBtn.textContent = 'OK';
        okBtn.onclick = () => {
          this.closeModal();
          if (onConfirm) onConfirm();
        };
        modalFooter.appendChild(okBtn);
      }
    }

    // Show modal
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'block';
    
    // Focus first button
    const firstButton = modalFooter?.querySelector('button');
    if (firstButton) {
      setTimeout(() => firstButton.focus(), 100);
    }
  }

  focusTaskInput() {
    const taskForm = this.components.get('taskForm');
    if (taskForm) {
      taskForm.focus();
    }
  }

  focusSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }

  showKeyboardShortcuts() {
    const shortcuts = [
      'Ctrl/Cmd + N: New task',
      'Ctrl/Cmd + F: Search',
      '/: Quick search',
      'Escape: Cancel current action',
      '?: Show this help'
    ];
    
    this.showNotification(
      'Keyboard Shortcuts:\n' + shortcuts.join('\n'),
      'info',
      { autoHide: false }
    );
  }

  // === UTILITY METHODS === */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  showLoadingState() {
    document.body.classList.add('app--loading');
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'block';
    }
  }

  hideLoadingState() {
    document.body.classList.remove('app--loading');
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  reportError(error, context) {
    // Placeholder for error reporting (analytics, logging service, etc.)
    console.log('Error reported:', { error: error.message, context });
  }

  handleInitializationError(error) {
    console.error('Failed to initialize application:', error);
    
    // Show fallback error UI
    document.body.innerHTML = `
      <div class="app-error" role="alert">
        <h1>Application Error</h1>
        <p>Sorry, the Todo List application failed to load properly.</p>
        <p>Please refresh the page to try again.</p>
        <button onclick="window.location.reload()" class="btn btn--primary">
          Refresh Page
        </button>
        <details style="margin-top: 1rem;">
          <summary>Technical Details</summary>
          <pre style="white-space: pre-wrap; font-size: 0.8rem;">${error.message}</pre>
        </details>
      </div>
    `;
  }

  // === PUBLIC API === */
  getComponent(name) {
    return this.components.get(name);
  }

  getState() {
    return this.state.getState();
  }

  isReady() {
    return this.isInitialized && !this.isDestroyed;
  }

  // === CLEANUP === */
  destroy() {
    if (this.isDestroyed) return;
    
    // Destroy all components
    this.components.forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
    this.components.clear();
    
    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
    
    // Clean up services
    if (this.taskManager && this.taskManager.destroy) {
      this.taskManager.destroy();
    }
    
    if (this.state && this.state.destroy) {
      this.state.destroy();
    }
    
    this.isDestroyed = true;
    
    emit(document, EVENTS.APP_DESTROY, {
      timestamp: new Date().toISOString()
    });
  }
}

// === APPLICATION INITIALIZATION === */
let appInstance = null;

export function getApp() {
  if (!appInstance) {
    appInstance = new App();
  }
  return appInstance;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = getApp();
    app.init();
  });
} else {
  // DOM already loaded
  const app = getApp();
  app.init();
}

// Global error handler
window.addEventListener('error', (event) => {
  logError(event.error, 'Global Error Handler');
});

window.addEventListener('unhandledrejection', (event) => {
  logError(event.reason, 'Unhandled Promise Rejection');
});

// Export for global access
window.TodoApp = getApp();