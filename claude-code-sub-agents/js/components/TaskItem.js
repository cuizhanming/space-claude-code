/* Task Item Component */

import { EVENTS } from '../constants/events.js';
import { CSS_CLASSES, ARIA_ATTRIBUTES } from '../constants/selectors.js';
import { 
  on, off, emit, logError, announceToScreenReader, 
  createElement, sanitizeHtml, hasClass, toggleClass
} from '../utils/helpers.js';
import { validateTaskTitle } from '../utils/validation.js';
import { smartFormatDateShort, formatRelativeTime } from '../utils/dateUtils.js';
import { getTaskManager } from '../modules/taskManager.js';
import { getStateManager } from '../modules/stateManager.js';

// === TASK ITEM COMPONENT === */
export class TaskItem {
  constructor(task, options = {}) {
    this.task = task;
    this.options = {
      enableEdit: true,
      enableDelete: true,
      enablePriorityDisplay: true,
      enableTimestamps: true,
      confirmDelete: true,
      showCompletionAnimation: true,
      allowKeyboardInteraction: true,
      ...options
    };

    this.taskManager = getTaskManager();
    this.state = getStateManager();
    this.element = null;
    this.elements = {};
    this.listeners = [];
    this.isEditing = false;
    this.isDestroyed = false;
    
    this.init();
  }

  // === INITIALIZATION === */
  init() {
    try {
      this.createElement();
      this.attachEventListeners();
      this.updateDisplay();

      emit(document, EVENTS.COMPONENT_MOUNTED, {
        component: 'TaskItem',
        taskId: this.task.id
      });

    } catch (error) {
      logError(error, 'TaskItem.init');
      this.handleError(error, 'Failed to initialize task item');
    }
  }

  createElement() {
    // Create main task item container
    this.element = createElement('li', {
      className: this.getTaskItemClasses(),
      'data-task-id': this.task.id,
      'data-priority': this.task.priority,
      role: 'listitem',
      tabindex: '0',
      'aria-labelledby': `task-title-${this.task.id}`,
      'aria-describedby': `task-meta-${this.task.id}`
    });

    // Create checkbox
    const checkbox = createElement('input', {
      type: 'checkbox',
      id: `task-checkbox-${this.task.id}`,
      className: 'task-item__checkbox',
      checked: this.task.completed,
      'aria-label': `Mark "${this.task.title}" as ${this.task.completed ? 'incomplete' : 'complete'}`,
      'aria-describedby': `task-title-${this.task.id}`
    });

    // Create content area
    const content = createElement('div', { className: 'task-item__content' });
    
    // Create title
    const title = createElement('div', {
      id: `task-title-${this.task.id}`,
      className: 'task-item__title',
      textContent: this.task.title
    });

    // Create edit input (hidden by default)
    const editInput = createElement('input', {
      type: 'text',
      className: 'task-item__title-input',
      value: this.task.title,
      maxlength: '500',
      'aria-label': 'Edit task title',
      style: 'display: none;'
    });

    // Create metadata
    const meta = createElement('div', {
      id: `task-meta-${this.task.id}`,
      className: 'task-item__meta'
    });

    content.appendChild(title);
    content.appendChild(editInput);
    content.appendChild(meta);

    // Create actions container
    const actions = createElement('div', {
      className: 'task-item__actions',
      role: 'group',
      'aria-label': `Actions for "${this.task.title}"`
    });

    // Create edit button
    if (this.options.enableEdit) {
      const editButton = createElement('button', {
        type: 'button',
        className: 'btn btn--icon task-item__action task-item__action--edit',
        'aria-label': `Edit "${this.task.title}"`,
        'data-action': 'edit-task',
        'data-task-id': this.task.id
      });
      editButton.innerHTML = `
        <svg class="icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      `;
      actions.appendChild(editButton);
    }

    // Create delete button
    if (this.options.enableDelete) {
      const deleteButton = createElement('button', {
        type: 'button',
        className: 'btn btn--icon btn--danger task-item__action task-item__action--delete',
        'aria-label': `Delete "${this.task.title}"`,
        'data-action': 'delete-task',
        'data-task-id': this.task.id
      });
      deleteButton.innerHTML = `
        <svg class="icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      `;
      actions.appendChild(deleteButton);
    }

    // Assemble the task item
    this.element.appendChild(checkbox);
    this.element.appendChild(content);
    this.element.appendChild(actions);

    // Store element references
    this.elements = {
      checkbox,
      content,
      title,
      editInput,
      meta,
      actions,
      editButton: actions.querySelector('.task-item__action--edit'),
      deleteButton: actions.querySelector('.task-item__action--delete')
    };
  }

  // === EVENT LISTENERS === */
  attachEventListeners() {
    // Checkbox toggle
    this.addListener(this.elements.checkbox, 'change', this.handleToggleComplete.bind(this));
    
    // Double-click to edit
    if (this.options.enableEdit) {
      this.addListener(this.elements.title, 'dblclick', this.startEdit.bind(this));
    }
    
    // Action buttons
    this.addListener(this.element, 'click', this.handleClick.bind(this));
    
    // Keyboard interactions
    if (this.options.allowKeyboardInteraction) {
      this.addListener(this.element, 'keydown', this.handleKeydown.bind(this));
    }
    
    // Edit input handling
    this.addListener(this.elements.editInput, 'keydown', this.handleEditKeydown.bind(this));
    this.addListener(this.elements.editInput, 'blur', this.handleEditBlur.bind(this));
    
    // Focus management
    this.addListener(this.element, 'focus', this.handleFocus.bind(this));
    this.addListener(this.element, 'blur', this.handleBlur.bind(this));
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  // === EVENT HANDLERS === */
  async handleToggleComplete(event) {
    try {
      event.stopPropagation();
      
      const wasCompleted = this.task.completed;
      const newCompleted = event.target.checked;
      
      // Optimistic update
      this.updateTaskState({ completed: newCompleted });
      
      // Update in task manager
      const updatedTask = await this.taskManager.toggleTaskComplete(this.task.id);
      
      // Update local task reference
      this.task = updatedTask;
      this.updateDisplay();
      
      // Show completion animation
      if (this.options.showCompletionAnimation && !wasCompleted && newCompleted) {
        this.showCompletionAnimation();
      }
      
      // Announce to screen reader
      const message = newCompleted 
        ? `Task "${this.task.title}" marked as complete`
        : `Task "${this.task.title}" marked as incomplete`;
      announceToScreenReader(message);
      
      // Emit event
      emit(this.element, EVENTS.TASK_UPDATED, {
        task: this.task,
        field: 'completed',
        oldValue: wasCompleted,
        newValue: newCompleted
      });
      
    } catch (error) {
      // Revert optimistic update
      event.target.checked = this.task.completed;
      this.updateDisplay();
      
      logError(error, 'TaskItem.handleToggleComplete');
      this.handleError(error, 'Failed to toggle task completion');
    }
  }

  handleClick(event) {
    const action = event.target.getAttribute('data-action');
    
    if (!action) return;
    
    event.stopPropagation();
    
    switch (action) {
      case 'edit-task':
        this.startEdit();
        break;
      case 'delete-task':
        this.handleDelete();
        break;
    }
  }

  handleKeydown(event) {
    if (this.isEditing) return;
    
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.elements.checkbox.click();
        break;
      case 'e':
      case 'F2':
        if (this.options.enableEdit) {
          event.preventDefault();
          this.startEdit();
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (this.options.enableDelete && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.handleDelete();
        }
        break;
    }
  }

  handleEditKeydown(event) {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.saveEdit();
        break;
      case 'Escape':
        event.preventDefault();
        this.cancelEdit();
        break;
    }
  }

  handleEditBlur(event) {
    // Delay to allow click events on buttons to fire first
    setTimeout(() => {
      if (this.isEditing) {
        this.saveEdit();
      }
    }, 100);
  }

  handleFocus(event) {
    this.element.classList.add('task-item--focused');
  }

  handleBlur(event) {
    this.element.classList.remove('task-item--focused');
  }

  // === EDIT FUNCTIONALITY === */
  startEdit() {
    if (this.isEditing || !this.options.enableEdit) return;
    
    this.isEditing = true;
    this.element.classList.add('task-item--editing');
    
    // Hide title, show input
    this.elements.title.style.display = 'none';
    this.elements.editInput.style.display = 'block';
    this.elements.editInput.value = this.task.title;
    this.elements.editInput.focus();
    this.elements.editInput.select();
    
    // Update state
    this.state.setEditingTask(this.task.id);
    
    // Emit event
    emit(this.element, EVENTS.TASK_EDIT_START, {
      taskId: this.task.id,
      element: this.element
    });
    
    announceToScreenReader(`Editing task "${this.task.title}"`);
  }

  async saveEdit() {
    if (!this.isEditing) return;
    
    try {
      const newTitle = this.elements.editInput.value.trim();
      
      // Validate title
      const validation = validateTaskTitle(newTitle);
      if (!validation.isValid) {
        this.showEditError(validation.errors[0]);
        return;
      }
      
      // Check if title actually changed
      if (newTitle === this.task.title) {
        this.cancelEdit();
        return;
      }
      
      // Update task
      const updatedTask = await this.taskManager.updateTask(this.task.id, {
        title: validation.sanitizedValue
      });
      
      this.task = updatedTask;
      this.finishEdit();
      
      announceToScreenReader(`Task updated to "${this.task.title}"`);
      
      // Emit event
      emit(this.element, EVENTS.TASK_UPDATED, {
        task: this.task,
        field: 'title',
        oldValue: this.task.title,
        newValue: validation.sanitizedValue
      });
      
    } catch (error) {
      logError(error, 'TaskItem.saveEdit');
      this.showEditError('Failed to save changes');
    }
  }

  cancelEdit() {
    if (!this.isEditing) return;
    
    this.elements.editInput.value = this.task.title;
    this.finishEdit();
    announceToScreenReader('Edit cancelled');
    
    emit(this.element, EVENTS.TASK_EDIT_CANCEL, {
      taskId: this.task.id,
      element: this.element
    });
  }

  finishEdit() {
    this.isEditing = false;
    this.element.classList.remove('task-item--editing');
    
    // Show title, hide input
    this.elements.title.style.display = 'block';
    this.elements.editInput.style.display = 'none';
    
    this.updateDisplay();
    this.element.focus();
    
    // Clear editing state
    this.state.setEditingTask(null);
    
    emit(this.element, EVENTS.TASK_EDIT_END, {
      taskId: this.task.id,
      element: this.element
    });
  }

  showEditError(message) {
    // Add error styling
    this.elements.editInput.classList.add('error');
    this.elements.editInput.setAttribute('aria-invalid', 'true');
    
    // Show error message
    announceToScreenReader(`Error: ${message}`, 'assertive');
    
    // Auto-remove error styling after delay
    setTimeout(() => {
      this.elements.editInput.classList.remove('error');
      this.elements.editInput.removeAttribute('aria-invalid');
    }, 3000);
  }

  // === DELETE FUNCTIONALITY === */
  async handleDelete() {
    if (!this.options.enableDelete) return;
    
    try {
      // Show confirmation if enabled
      if (this.options.confirmDelete) {
        const confirmed = await this.showDeleteConfirmation();
        if (!confirmed) return;
      }
      
      // Delete task
      await this.taskManager.deleteTask(this.task.id);
      
      announceToScreenReader(`Task "${this.task.title}" deleted`);
      
      // Emit event before destroying
      emit(this.element, EVENTS.TASK_DELETED, {
        task: this.task,
        element: this.element
      });
      
      // Remove from DOM with animation
      this.removeWithAnimation();
      
    } catch (error) {
      logError(error, 'TaskItem.handleDelete');
      this.handleError(error, 'Failed to delete task');
    }
  }

  async showDeleteConfirmation() {
    return new Promise((resolve) => {
      emit(document, EVENTS.MODAL_OPEN, {
        type: 'confirm',
        title: 'Delete Task',
        message: `Are you sure you want to delete "${this.task.title}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmClass: 'btn--danger',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }

  // === DISPLAY UPDATES === */
  updateDisplay() {
    if (this.isDestroyed) return;
    
    // Update checkbox
    this.elements.checkbox.checked = this.task.completed;
    this.elements.checkbox.setAttribute('aria-label', 
      `Mark "${this.task.title}" as ${this.task.completed ? 'incomplete' : 'complete'}`
    );
    
    // Update title
    this.elements.title.textContent = this.task.title;
    
    // Update metadata
    this.updateMetadata();
    
    // Update classes
    this.element.className = this.getTaskItemClasses();
    this.element.setAttribute('data-priority', this.task.priority);
    
    // Update accessibility
    this.updateAccessibility();
  }

  updateMetadata() {
    if (!this.options.enableTimestamps) {
      this.elements.meta.style.display = 'none';
      return;
    }
    
    const metaParts = [];
    
    // Priority indicator
    if (this.options.enablePriorityDisplay) {
      const priorityText = this.task.priority.charAt(0).toUpperCase() + this.task.priority.slice(1);
      metaParts.push(`<span class="task-meta__priority" aria-label="Priority">${priorityText}</span>`);
    }
    
    // Creation date
    const createdText = smartFormatDateShort(this.task.createdAt);
    if (createdText) {
      metaParts.push(`<span class="task-meta__created" aria-label="Created">${createdText}</span>`);
    }
    
    // Completion date
    if (this.task.completed && this.task.completedAt) {
      const completedText = smartFormatDateShort(this.task.completedAt);
      metaParts.push(`<span class="task-meta__completed" aria-label="Completed">${completedText}</span>`);
    }
    
    this.elements.meta.innerHTML = metaParts.join('<span class="task-meta__separator">•</span>');
  }

  updateAccessibility() {
    // Update ARIA labels
    this.element.setAttribute('aria-labelledby', `task-title-${this.task.id}`);
    this.element.setAttribute('aria-describedby', `task-meta-${this.task.id}`);
    
    // Update completion state for screen readers
    if (this.task.completed) {
      this.element.setAttribute('aria-label', `Completed task: ${this.task.title}`);
    } else {
      this.element.removeAttribute('aria-label');
    }
  }

  updateTaskState(updates) {
    this.task = { ...this.task, ...updates, updatedAt: new Date().toISOString() };
  }

  // === VISUAL EFFECTS === */
  showCompletionAnimation() {
    this.element.classList.add('task-item--completing');
    
    setTimeout(() => {
      this.element.classList.remove('task-item--completing');
    }, 600);
  }

  removeWithAnimation() {
    this.element.classList.add('task-item--removing');
    
    setTimeout(() => {
      this.destroy();
    }, 300);
  }

  // === UTILITY METHODS === */
  getTaskItemClasses() {
    const classes = ['task-item'];
    
    if (this.task.completed) {
      classes.push('task-item--completed');
    }
    
    if (this.task.priority && this.task.priority !== 'medium') {
      classes.push(`task-item--priority-${this.task.priority}`);
    }
    
    if (this.isEditing) {
      classes.push('task-item--editing');
    }
    
    return classes.join(' ');
  }

  // === PUBLIC API === */
  update(newTask) {
    const oldTask = this.task;
    this.task = { ...newTask };
    this.updateDisplay();
    
    emit(this.element, EVENTS.COMPONENT_UPDATED, {
      component: 'TaskItem',
      taskId: this.task.id,
      oldTask,
      newTask: this.task
    });
  }

  focus() {
    if (this.element && !this.isDestroyed) {
      this.element.focus();
    }
  }

  getElement() {
    return this.element;
  }

  getTask() {
    return { ...this.task };
  }

  isEditingMode() {
    return this.isEditing;
  }

  // === ERROR HANDLING === */
  handleError(error, userMessage) {
    emit(document, EVENTS.APP_ERROR, {
      error,
      context: 'TaskItem',
      taskId: this.task.id,
      userMessage,
      timestamp: new Date().toISOString()
    });

    // Show user notification
    this.state.showNotification(
      userMessage || 'An error occurred with this task',
      'error',
      { autoHide: true, duration: 3000 }
    );
  }

  // === CLEANUP === */
  destroy() {
    if (this.isDestroyed) return;
    
    // Remove event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
    
    // Cancel edit mode
    if (this.isEditing) {
      this.state.setEditingTask(null);
    }
    
    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    this.isDestroyed = true;
    
    emit(document, EVENTS.COMPONENT_UNMOUNTED, {
      component: 'TaskItem',
      taskId: this.task.id
    });
  }
}

// === FACTORY FUNCTION === */
export function createTaskItem(task, options) {
  return new TaskItem(task, options);
}

// === BATCH OPERATIONS === */
export function createTaskItems(tasks, options = {}) {
  return tasks.map(task => new TaskItem(task, options));
}

export function destroyTaskItems(taskItems) {
  taskItems.forEach(taskItem => {
    if (taskItem && taskItem.destroy) {
      taskItem.destroy();
    }
  });
}