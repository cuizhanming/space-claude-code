/* DOM Selectors Constants */

export const SELECTORS = {
  // Application root
  APP: '#app',
  
  // Header elements
  HEADER: '.app__header',
  HEADER_TITLE: '.header__title',
  HEADER_THEME_TOGGLE: '.header__theme-toggle',
  HEADER_MENU_TOGGLE: '.header__menu-toggle',
  
  // Sidebar elements
  SIDEBAR: '#sidebar',
  SIDEBAR_SECTION: '.sidebar__section',
  SIDEBAR_CLEAR_FILTERS: '.sidebar__clear-filters',
  
  // Search elements
  SEARCH_INPUT: '#search-input',
  SEARCH_CLEAR: '.search-bar__clear',
  
  // Filter elements
  FILTER_BUTTONS: '.filter-buttons',
  FILTER_BUTTON: '.btn--filter',
  FILTER_COUNT: '.filter-count',
  
  // Main content
  MAIN_CONTENT: '#main-content',
  
  // Task form elements
  TASK_FORM: '#task-form',
  TASK_INPUT: '#task-input',
  TASK_INPUT_ERROR: '#task-input-error',
  PRIORITY_SELECT: '#priority-select',
  TASK_SUBMIT: '.task-form__submit',
  
  // Task list elements
  TASK_LIST: '#task-list',
  TASK_LIST_CONTAINER: '.task-list-container',
  TASK_LIST_HEADING: '.task-list-heading',
  TASK_ITEM: '.task-item',
  TASK_CHECKBOX: '.task-item__checkbox',
  TASK_TITLE: '.task-item__title',
  TASK_TITLE_INPUT: '.task-item__title-input',
  TASK_META: '.task-item__meta',
  TASK_ACTIONS: '.task-item__actions',
  TASK_EDIT_BTN: '.task-item__action--edit',
  TASK_DELETE_BTN: '.task-item__action--delete',
  
  // Task counts
  TASK_COUNT_TOTAL: '[data-count="total"]',
  TASK_COUNT_ACTIVE: '[data-count="active"]',
  TASK_COUNT_COMPLETED: '[data-count="completed"]',
  TASK_COUNT_ALL: '[data-count="all"]',
  
  // Empty states
  EMPTY_STATE: '#empty-state',
  NO_RESULTS_STATE: '#no-results-state',
  
  // Modal elements
  MODAL: '#modal',
  MODAL_BACKDROP: '.modal__backdrop',
  MODAL_CONTAINER: '.modal__container',
  MODAL_TITLE: '#modal-title',
  MODAL_DESCRIPTION: '#modal-description',
  MODAL_HEADER: '.modal__header',
  MODAL_BODY: '.modal__body',
  MODAL_FOOTER: '.modal__footer',
  MODAL_CLOSE: '.modal__close',
  
  // Notification elements
  NOTIFICATION_CONTAINER: '.notification-container',
  NOTIFICATION: '.notification',
  NOTIFICATION_CLOSE: '.notification__close',
  
  // Screen reader elements
  SR_ANNOUNCEMENTS: '#sr-announcements',
  SR_ONLY: '.sr-only',
  
  // Button elements
  BTN: '.btn',
  BTN_PRIMARY: '.btn--primary',
  BTN_SECONDARY: '.btn--secondary',
  BTN_DANGER: '.btn--danger',
  BTN_ICON: '.btn--icon',
  
  // Footer elements
  FOOTER: '.app__footer',
  EXPORT_TASKS_BTN: '[data-action="export-tasks"]',
  CLEAR_COMPLETED_BTN: '[data-action="clear-completed"]',
  
  // Data attribute selectors
  DATA_ACTION: '[data-action]',
  DATA_FILTER: '[data-filter]',
  DATA_TASK_ID: '[data-task-id]',
  DATA_COUNT: '[data-count]',
  DATA_THEME: '[data-theme]',
  
  // Form elements
  FORM: 'form',
  INPUT: 'input',
  SELECT: 'select',
  TEXTAREA: 'textarea',
  BUTTON: 'button',
  
  // Generic utility selectors
  HIDDEN: '.hidden',
  VISIBLE: '.visible',
  ACTIVE: '.active',
  DISABLED: '.disabled',
  LOADING: '.loading',
  ERROR: '.error',
  SUCCESS: '.success'
};

// Action data attribute values
export const ACTIONS = {
  TOGGLE_THEME: 'toggle-theme',
  TOGGLE_SIDEBAR: 'toggle-sidebar',
  CLOSE_MODAL: 'close-modal',
  CLEAR_SEARCH: 'clear-search',
  CLEAR_FILTERS: 'clear-filters',
  CLEAR_COMPLETED: 'clear-completed',
  EXPORT_TASKS: 'export-tasks',
  EDIT_TASK: 'edit-task',
  DELETE_TASK: 'delete-task',
  COMPLETE_TASK: 'complete-task'
};

// Filter data attribute values
export const FILTERS = {
  ALL: 'all',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ALL_PRIORITY: 'all-priority',
  HIGH_PRIORITY: 'high',
  MEDIUM_PRIORITY: 'medium',
  LOW_PRIORITY: 'low'
};

// CSS class name utilities
export const CSS_CLASSES = {
  // State classes
  HIDDEN: 'hidden',
  VISIBLE: 'visible',
  ACTIVE: 'active',
  DISABLED: 'disabled',
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
  
  // Component state classes
  TASK_COMPLETED: 'task-item--completed',
  TASK_EDITING: 'task-item--editing',
  TASK_SELECTED: 'task-item--selected',
  TASK_HIGH_PRIORITY: 'task-item--priority-high',
  TASK_MEDIUM_PRIORITY: 'task-item--priority-medium',
  TASK_LOW_PRIORITY: 'task-item--priority-low',
  
  // UI state classes
  SIDEBAR_OPEN: 'app__sidebar--open',
  MODAL_OPEN: 'modal--open',
  FILTER_ACTIVE: 'btn--filter-active',
  
  // Animation classes
  ANIMATE_FADE_IN: 'animate-fade-in',
  ANIMATE_SLIDE_IN_UP: 'animate-slide-in-up',
  ANIMATE_SLIDE_IN_DOWN: 'animate-slide-in-down',
  ANIMATE_SCALE_IN: 'animate-scale-in',
  ANIMATE_BOUNCE: 'animate-bounce',
  
  // Theme classes
  THEME_LIGHT: 'theme-light',
  THEME_DARK: 'theme-dark'
};

// ARIA attribute utilities
export const ARIA_ATTRIBUTES = {
  HIDDEN: 'aria-hidden',
  EXPANDED: 'aria-expanded',
  PRESSED: 'aria-pressed',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  DISABLED: 'aria-disabled',
  LABEL: 'aria-label',
  LABELLEDBY: 'aria-labelledby',
  DESCRIBEDBY: 'aria-describedby',
  LIVE: 'aria-live',
  ATOMIC: 'aria-atomic',
  BUSY: 'aria-busy',
  INVALID: 'aria-invalid',
  REQUIRED: 'aria-required'
};

// Helper functions for selector operations
export const SelectorUtils = {
  // Get element by selector
  get(selector) {
    return document.querySelector(selector);
  },
  
  // Get all elements by selector
  getAll(selector) {
    return document.querySelectorAll(selector);
  },
  
  // Check if element exists
  exists(selector) {
    return document.querySelector(selector) !== null;
  },
  
  // Get element by data attribute
  getByData(attribute, value) {
    return document.querySelector(`[data-${attribute}="${value}"]`);
  },
  
  // Get all elements by data attribute
  getAllByData(attribute, value) {
    return document.querySelectorAll(`[data-${attribute}="${value}"]`);
  },
  
  // Find closest parent with selector
  closest(element, selector) {
    return element?.closest(selector);
  },
  
  // Find child elements
  find(parent, selector) {
    return parent?.querySelector(selector);
  },
  
  // Find all child elements
  findAll(parent, selector) {
    return parent?.querySelectorAll(selector) || [];
  }
};