/* Application Event Constants */

export const EVENTS = {
  // Task events
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_COMPLETED: 'task:completed',
  TASK_UNCOMPLETED: 'task:uncompleted',
  TASK_EDIT_START: 'task:edit-start',
  TASK_EDIT_END: 'task:edit-end',
  TASK_EDIT_CANCEL: 'task:edit-cancel',
  
  // Filter events
  FILTER_CHANGED: 'filter:changed',
  FILTER_STATUS_CHANGED: 'filter:status-changed',
  FILTER_PRIORITY_CHANGED: 'filter:priority-changed',
  FILTER_SEARCH_CHANGED: 'filter:search-changed',
  FILTER_CLEARED: 'filter:cleared',
  
  // Search events
  SEARCH_QUERY_CHANGED: 'search:query-changed',
  SEARCH_RESULTS_UPDATED: 'search:results-updated',
  SEARCH_CLEARED: 'search:cleared',
  
  // UI events
  THEME_CHANGED: 'theme:changed',
  SIDEBAR_TOGGLED: 'sidebar:toggled',
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',
  NOTIFICATION_SHOW: 'notification:show',
  NOTIFICATION_HIDE: 'notification:hide',
  
  // State events
  STATE_CHANGED: 'state:changed',
  STATE_RESET: 'state:reset',
  STATE_LOADED: 'state:loaded',
  STATE_SAVED: 'state:saved',
  
  // Storage events
  STORAGE_SAVED: 'storage:saved',
  STORAGE_LOADED: 'storage:loaded',
  STORAGE_ERROR: 'storage:error',
  STORAGE_CLEARED: 'storage:cleared',
  
  // Form events
  FORM_SUBMIT: 'form:submit',
  FORM_RESET: 'form:reset',
  FORM_VALIDATE: 'form:validate',
  FORM_ERROR: 'form:error',
  
  // Application lifecycle events
  APP_INIT: 'app:init',
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',
  APP_DESTROY: 'app:destroy',
  
  // Component events
  COMPONENT_MOUNTED: 'component:mounted',
  COMPONENT_UNMOUNTED: 'component:unmounted',
  COMPONENT_UPDATED: 'component:updated',
  COMPONENT_ERROR: 'component:error',
  
  // Keyboard events
  KEYBOARD_SHORTCUT: 'keyboard:shortcut',
  KEYBOARD_ESCAPE: 'keyboard:escape',
  KEYBOARD_ENTER: 'keyboard:enter',
  
  // Drag and drop events (for future use)
  DRAG_START: 'drag:start',
  DRAG_END: 'drag:end',
  DROP: 'drop',
  
  // Bulk operations events
  BULK_SELECT: 'bulk:select',
  BULK_DESELECT: 'bulk:deselect',
  BULK_DELETE: 'bulk:delete',
  BULK_COMPLETE: 'bulk:complete',
  
  // Performance events
  PERFORMANCE_MEASURE: 'performance:measure',
  
  // Debug events
  DEBUG_LOG: 'debug:log',
  DEBUG_ERROR: 'debug:error',
  DEBUG_WARN: 'debug:warn'
};

// Event priority levels
export const EVENT_PRIORITY = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3
};

// Default event options
export const DEFAULT_EVENT_OPTIONS = {
  bubbles: true,
  cancelable: true,
  priority: EVENT_PRIORITY.NORMAL
};

// Custom event factory
export function createEvent(type, detail = null, options = {}) {
  const eventOptions = {
    ...DEFAULT_EVENT_OPTIONS,
    ...options,
    detail
  };
  
  return new CustomEvent(type, eventOptions);
}

// Event validation
export function isValidEvent(eventType) {
  return Object.values(EVENTS).includes(eventType);
}

// Event namespaces for easier filtering
export const EVENT_NAMESPACES = {
  TASK: Object.keys(EVENTS).filter(key => key.startsWith('TASK_')).map(key => EVENTS[key]),
  FILTER: Object.keys(EVENTS).filter(key => key.startsWith('FILTER_')).map(key => EVENTS[key]),
  SEARCH: Object.keys(EVENTS).filter(key => key.startsWith('SEARCH_')).map(key => EVENTS[key]),
  UI: Object.keys(EVENTS).filter(key => key.startsWith('THEME_') || key.startsWith('SIDEBAR_') || key.startsWith('MODAL_') || key.startsWith('NOTIFICATION_')).map(key => EVENTS[key]),
  STATE: Object.keys(EVENTS).filter(key => key.startsWith('STATE_')).map(key => EVENTS[key]),
  STORAGE: Object.keys(EVENTS).filter(key => key.startsWith('STORAGE_')).map(key => EVENTS[key]),
  FORM: Object.keys(EVENTS).filter(key => key.startsWith('FORM_')).map(key => EVENTS[key]),
  APP: Object.keys(EVENTS).filter(key => key.startsWith('APP_')).map(key => EVENTS[key]),
  COMPONENT: Object.keys(EVENTS).filter(key => key.startsWith('COMPONENT_')).map(key => EVENTS[key]),
  KEYBOARD: Object.keys(EVENTS).filter(key => key.startsWith('KEYBOARD_')).map(key => EVENTS[key])
};