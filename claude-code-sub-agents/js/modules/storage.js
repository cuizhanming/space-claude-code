/* Local Storage Management System */

import { EVENTS } from '../constants/events.js';
import { logError, emit, isStorageAvailable, deepClone } from '../utils/helpers.js';

// === STORAGE CONSTANTS === */
const STORAGE_KEYS = {
  TASKS: 'todoapp_tasks',
  SETTINGS: 'todoapp_settings',
  UI_STATE: 'todoapp_ui_state',
  VERSION: 'todoapp_version'
};

const CURRENT_VERSION = '1.0.0';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

// === STORAGE SERVICE CLASS === */
export class StorageService {
  constructor() {
    this.isAvailable = isStorageAvailable('localStorage');
    this.listeners = new Set();
    this.initializeStorage();
  }

  // === INITIALIZATION === */
  initializeStorage() {
    if (!this.isAvailable) {
      console.warn('localStorage is not available. Data will not persist.');
      emit(document, EVENTS.STORAGE_ERROR, {
        error: 'localStorage not available',
        fallback: 'memory'
      });
      return;
    }

    try {
      // Check version and handle migration if needed
      const storedVersion = this.getItem(STORAGE_KEYS.VERSION);
      if (!storedVersion || storedVersion !== CURRENT_VERSION) {
        this.handleVersionMigration(storedVersion, CURRENT_VERSION);
      }

      // Validate existing data
      this.validateStoredData();

      emit(document, EVENTS.STORAGE_LOADED, {
        version: CURRENT_VERSION,
        isAvailable: this.isAvailable
      });
    } catch (error) {
      logError(error, 'StorageService.initializeStorage');
      this.handleStorageError(error);
    }
  }

  // === TASK OPERATIONS === */
  async saveTasks(tasks) {
    try {
      const validatedTasks = this.validateTasks(tasks);
      const dataToStore = {
        tasks: validatedTasks,
        timestamp: new Date().toISOString(),
        version: CURRENT_VERSION
      };

      this.setItem(STORAGE_KEYS.TASKS, dataToStore);
      
      emit(document, EVENTS.STORAGE_SAVED, {
        type: 'tasks',
        count: validatedTasks.length,
        size: this.getDataSize(dataToStore)
      });

      return true;
    } catch (error) {
      logError(error, 'StorageService.saveTasks');
      this.handleStorageError(error);
      return false;
    }
  }

  async loadTasks() {
    try {
      const data = this.getItem(STORAGE_KEYS.TASKS);
      
      if (!data) {
        return [];
      }

      // Handle legacy format (array of tasks directly)
      if (Array.isArray(data)) {
        const tasks = this.validateTasks(data);
        // Migrate to new format
        await this.saveTasks(tasks);
        return tasks;
      }

      // Handle new format (object with metadata)
      if (data.tasks && Array.isArray(data.tasks)) {
        return this.validateTasks(data.tasks);
      }

      console.warn('Invalid tasks data format, returning empty array');
      return [];
    } catch (error) {
      logError(error, 'StorageService.loadTasks');
      this.handleStorageError(error);
      return [];
    }
  }

  // === SETTINGS OPERATIONS === */
  async saveSettings(settings) {
    try {
      const validatedSettings = this.validateSettings(settings);
      const dataToStore = {
        settings: validatedSettings,
        timestamp: new Date().toISOString(),
        version: CURRENT_VERSION
      };

      this.setItem(STORAGE_KEYS.SETTINGS, dataToStore);
      
      emit(document, EVENTS.STORAGE_SAVED, {
        type: 'settings',
        size: this.getDataSize(dataToStore)
      });

      return true;
    } catch (error) {
      logError(error, 'StorageService.saveSettings');
      this.handleStorageError(error);
      return false;
    }
  }

  async loadSettings() {
    try {
      const data = this.getItem(STORAGE_KEYS.SETTINGS);
      
      if (!data) {
        return this.getDefaultSettings();
      }

      // Handle legacy format or new format
      const settings = data.settings || data;
      return this.validateSettings(settings);
    } catch (error) {
      logError(error, 'StorageService.loadSettings');
      this.handleStorageError(error);
      return this.getDefaultSettings();
    }
  }

  // === UI STATE OPERATIONS === */
  async saveUIState(uiState) {
    try {
      const filteredState = this.filterUIStateForStorage(uiState);
      const dataToStore = {
        uiState: filteredState,
        timestamp: new Date().toISOString(),
        version: CURRENT_VERSION
      };

      this.setItem(STORAGE_KEYS.UI_STATE, dataToStore);
      return true;
    } catch (error) {
      logError(error, 'StorageService.saveUIState');
      this.handleStorageError(error);
      return false;
    }
  }

  async loadUIState() {
    try {
      const data = this.getItem(STORAGE_KEYS.UI_STATE);
      
      if (!data) {
        return this.getDefaultUIState();
      }

      const uiState = data.uiState || data;
      return this.validateUIState(uiState);
    } catch (error) {
      logError(error, 'StorageService.loadUIState');
      this.handleStorageError(error);
      return this.getDefaultUIState();
    }
  }

  // === BACKUP AND RESTORE === */
  async exportData() {
    try {
      const tasks = await this.loadTasks();
      const settings = await this.loadSettings();
      const uiState = await this.loadUIState();

      const exportData = {
        version: CURRENT_VERSION,
        timestamp: new Date().toISOString(),
        tasks,
        settings,
        uiState,
        metadata: {
          taskCount: tasks.length,
          exportedBy: 'Todo List MVP',
          userAgent: navigator.userAgent
        }
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logError(error, 'StorageService.exportData');
      throw new Error('Failed to export data');
    }
  }

  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      // Validate import data structure
      if (!this.validateImportData(data)) {
        throw new Error('Invalid import data format');
      }

      // Create backup before import
      const backupData = await this.exportData();
      
      try {
        // Import tasks
        if (data.tasks) {
          await this.saveTasks(data.tasks);
        }

        // Import settings
        if (data.settings) {
          await this.saveSettings(data.settings);
        }

        // Import UI state (optional)
        if (data.uiState) {
          await this.saveUIState(data.uiState);
        }

        emit(document, EVENTS.STORAGE_SAVED, {
          type: 'import',
          count: data.tasks?.length || 0
        });

        return {
          success: true,
          imported: {
            tasks: data.tasks?.length || 0,
            settings: data.settings ? 1 : 0,
            uiState: data.uiState ? 1 : 0
          }
        };
      } catch (importError) {
        // Restore backup on failure
        await this.importData(backupData);
        throw importError;
      }
    } catch (error) {
      logError(error, 'StorageService.importData');
      throw new Error('Failed to import data: ' + error.message);
    }
  }

  // === CLEANUP AND UTILITIES === */
  async clearAllData() {
    try {
      if (!this.isAvailable) {
        return true;
      }

      // Remove all application data
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      emit(document, EVENTS.STORAGE_CLEARED, {
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      logError(error, 'StorageService.clearAllData');
      this.handleStorageError(error);
      return false;
    }
  }

  getStorageInfo() {
    if (!this.isAvailable) {
      return {
        used: 0,
        total: 0,
        available: 0,
        percentage: 0,
        isAvailable: false
      };
    }

    try {
      let used = 0;
      
      // Calculate used space for our app
      Object.values(STORAGE_KEYS).forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          used += new Blob([value]).size;
        }
      });

      return {
        used,
        total: MAX_STORAGE_SIZE,
        available: MAX_STORAGE_SIZE - used,
        percentage: (used / MAX_STORAGE_SIZE) * 100,
        isAvailable: true
      };
    } catch (error) {
      logError(error, 'StorageService.getStorageInfo');
      return {
        used: 0,
        total: MAX_STORAGE_SIZE,
        available: MAX_STORAGE_SIZE,
        percentage: 0,
        isAvailable: false
      };
    }
  }

  // === PRIVATE HELPER METHODS === */
  setItem(key, value) {
    if (!this.isAvailable) {
      throw new Error('localStorage is not available');
    }

    try {
      const serialized = JSON.stringify(value);
      const size = new Blob([serialized]).size;

      // Check storage quota
      const storageInfo = this.getStorageInfo();
      if (storageInfo.used + size > MAX_STORAGE_SIZE) {
        throw new Error('Storage quota exceeded');
      }

      localStorage.setItem(key, serialized);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded');
      }
      throw error;
    }
  }

  getItem(key) {
    if (!this.isAvailable) {
      return null;
    }

    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logError(error, `StorageService.getItem - Key: ${key}`);
      return null;
    }
  }

  validateTasks(tasks) {
    if (!Array.isArray(tasks)) {
      throw new Error('Tasks must be an array');
    }

    return tasks.filter(task => {
      if (!task || typeof task !== 'object') {
        console.warn('Invalid task object, skipping:', task);
        return false;
      }

      if (!task.id || !task.title) {
        console.warn('Task missing required fields (id, title), skipping:', task);
        return false;
      }

      return true;
    }).map(task => ({
      id: task.id,
      title: String(task.title).substring(0, 500), // Enforce length limit
      completed: Boolean(task.completed),
      priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString(),
      completedAt: task.completedAt || null
    }));
  }

  validateSettings(settings) {
    const defaults = this.getDefaultSettings();
    
    if (!settings || typeof settings !== 'object') {
      return defaults;
    }

    return {
      maxTasks: Math.max(1, Math.min(Number(settings.maxTasks) || defaults.maxTasks, 10000)),
      autoSave: Boolean(settings.autoSave !== undefined ? settings.autoSave : defaults.autoSave),
      confirmDeletion: Boolean(settings.confirmDeletion !== undefined ? settings.confirmDeletion : defaults.confirmDeletion),
      showCompletedTasks: Boolean(settings.showCompletedTasks !== undefined ? settings.showCompletedTasks : defaults.showCompletedTasks),
      taskSortBy: ['createdAt', 'updatedAt', 'title', 'priority'].includes(settings.taskSortBy) ? settings.taskSortBy : defaults.taskSortBy,
      taskSortDirection: ['asc', 'desc'].includes(settings.taskSortDirection) ? settings.taskSortDirection : defaults.taskSortDirection
    };
  }

  validateUIState(uiState) {
    const defaults = this.getDefaultUIState();
    
    if (!uiState || typeof uiState !== 'object') {
      return defaults;
    }

    return {
      theme: ['light', 'dark'].includes(uiState.theme) ? uiState.theme : defaults.theme,
      sidebarOpen: Boolean(uiState.sidebarOpen),
      filters: {
        status: ['all', 'active', 'completed'].includes(uiState.filters?.status) ? uiState.filters.status : defaults.filters.status,
        priority: ['all', 'low', 'medium', 'high'].includes(uiState.filters?.priority) ? uiState.filters.priority : defaults.filters.priority,
        searchQuery: String(uiState.filters?.searchQuery || '').substring(0, 200)
      }
    };
  }

  getDefaultSettings() {
    return {
      maxTasks: 1000,
      autoSave: true,
      confirmDeletion: true,
      showCompletedTasks: true,
      taskSortBy: 'createdAt',
      taskSortDirection: 'desc'
    };
  }

  getDefaultUIState() {
    return {
      theme: 'light',
      sidebarOpen: false,
      filters: {
        status: 'all',
        priority: 'all',
        searchQuery: ''
      }
    };
  }

  filterUIStateForStorage(uiState) {
    // Only store persistent UI state, exclude temporary state
    return {
      theme: uiState.theme,
      filters: uiState.filters
    };
  }

  validateImportData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Must have at least tasks
    if (!data.tasks || !Array.isArray(data.tasks)) {
      return false;
    }

    // Check version compatibility (basic check)
    if (data.version && !data.version.startsWith('1.')) {
      return false;
    }

    return true;
  }

  handleVersionMigration(oldVersion, newVersion) {
    console.log(`Migrating from version ${oldVersion || 'unknown'} to ${newVersion}`);
    
    // Set new version
    this.setItem(STORAGE_KEYS.VERSION, newVersion);

    // Future: Add migration logic here when needed
    emit(document, EVENTS.STORAGE_SAVED, {
      type: 'migration',
      from: oldVersion,
      to: newVersion
    });
  }

  validateStoredData() {
    // Check for corrupted data and attempt recovery
    try {
      const tasks = this.getItem(STORAGE_KEYS.TASKS);
      if (tasks && !this.validateImportData({ tasks: Array.isArray(tasks) ? tasks : tasks.tasks })) {
        console.warn('Corrupted task data detected, clearing...');
        localStorage.removeItem(STORAGE_KEYS.TASKS);
      }
    } catch (error) {
      console.warn('Error validating stored data:', error);
      localStorage.removeItem(STORAGE_KEYS.TASKS);
    }
  }

  handleStorageError(error) {
    emit(document, EVENTS.STORAGE_ERROR, {
      error: error.message,
      timestamp: new Date().toISOString()
    });

    if (error.message.includes('quota')) {
      emit(document, EVENTS.NOTIFICATION_SHOW, {
        message: 'Storage space is full. Please clear some tasks or export your data.',
        type: 'warning',
        autoHide: false
      });
    }
  }

  getDataSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }
}

// === SINGLETON INSTANCE === */
let storageServiceInstance = null;

export function getStorageService() {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
}

// Export default instance
export default getStorageService();