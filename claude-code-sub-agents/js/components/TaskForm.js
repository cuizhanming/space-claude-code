/* Task Form Component */

import { EVENTS } from '../constants/events.js';
import { SELECTORS } from '../constants/selectors.js';
import { on, off, emit, logError, announceToScreenReader } from '../utils/helpers.js';
import { validateTaskTitle, validateTaskPriority } from '../utils/validation.js';
import { getTaskManager } from '../modules/taskManager.js';

// === TASK FORM COMPONENT === */
export class TaskForm {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      autoFocus: true,
      validateOnInput: true,
      showSuccessMessage: true,
      clearOnSubmit: true,
      submitOnEnter: true,
      ...options
    };

    this.taskManager = getTaskManager();
    this.elements = {};
    this.listeners = [];
    this.isSubmitting = false;
    
    this.init();
  }

  // === INITIALIZATION === */
  init() {
    try {
      if (!this.container) {
        throw new Error('TaskForm container not found');
      }

      this.findElements();
      this.attachEventListeners();
      this.setupValidation();
      
      if (this.options.autoFocus && this.elements.input) {
        this.elements.input.focus();
      }

      emit(document, EVENTS.COMPONENT_MOUNTED, {
        component: 'TaskForm',
        container: this.container
      });

    } catch (error) {
      logError(error, 'TaskForm.init');
      this.handleError(error, 'Failed to initialize task form');
    }
  }

  // === DOM ELEMENT DISCOVERY === */
  findElements() {
    this.elements = {
      form: this.container.querySelector('#task-form') || this.container.querySelector('form'),
      input: this.container.querySelector('#task-input'),
      prioritySelect: this.container.querySelector('#priority-select') || this.container.querySelector('#task-priority'),
      categoryInput: this.container.querySelector('#task-category'),
      dueDateInput: this.container.querySelector('#task-due-date'),
      advancedToggle: this.container.querySelector('#toggle-advanced'),
      advancedSection: this.container.querySelector('#advanced-options') || this.container.querySelector('.task-form__advanced'),
      submitButton: this.container.querySelector('.task-form__submit'),
      errorContainer: this.container.querySelector('#task-input-error'),
      helpText: this.container.querySelector('#task-input-help')
    };

    // Validate required elements
    if (!this.elements.form) {
      throw new Error('Task form element not found');
    }
    if (!this.elements.input) {
      throw new Error('Task input element not found');
    }
  }

  // === EVENT LISTENERS === */
  attachEventListeners() {
    // Form submission
    this.addListener(this.elements.form, 'submit', this.handleSubmit.bind(this));
    
    // Input events
    this.addListener(this.elements.input, 'input', this.handleInput.bind(this));
    this.addListener(this.elements.input, 'keydown', this.handleKeydown.bind(this));
    this.addListener(this.elements.input, 'focus', this.handleInputFocus.bind(this));
    this.addListener(this.elements.input, 'blur', this.handleInputBlur.bind(this));

    // Priority selection
    if (this.elements.prioritySelect) {
      this.addListener(this.elements.prioritySelect, 'change', this.handlePriorityChange.bind(this));
    }

    // Category input
    if (this.elements.categoryInput) {
      this.addListener(this.elements.categoryInput, 'input', this.handleCategoryInput.bind(this));
    }

    // Due date input
    if (this.elements.dueDateInput) {
      this.addListener(this.elements.dueDateInput, 'change', this.handleDueDateChange.bind(this));
    }

    // Advanced options toggle
    if (this.elements.advancedToggle) {
      this.addListener(this.elements.advancedToggle, 'click', this.handleAdvancedToggle.bind(this));
    }

    // Submit button
    if (this.elements.submitButton) {
      this.addListener(this.elements.submitButton, 'click', this.handleSubmitClick.bind(this));
    }

    // Global events
    this.addListener(document, EVENTS.KEYBOARD_ESCAPE, this.handleEscape.bind(this));
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  // === EVENT HANDLERS === */
  async handleSubmit(event) {
    event.preventDefault();
    
    if (this.isSubmitting) {
      return;
    }

    try {
      const formData = this.getFormData();
      const validation = this.validateForm(formData);

      if (!validation.isValid) {
        this.showValidationErrors(validation.errors);
        this.elements.input.focus();
        return;
      }

      this.setSubmitting(true);
      this.clearErrors();

      // Create the task
      const task = await this.taskManager.createTask(formData);

      // Success feedback
      if (this.options.showSuccessMessage) {
        announceToScreenReader(`Task "${task.title}" added successfully`);
        emit(document, EVENTS.NOTIFICATION_SHOW, {
          message: 'Task added successfully!',
          type: 'success',
          autoHide: true,
          duration: 3000
        });
      }

      // Reset form
      if (this.options.clearOnSubmit) {
        this.reset();
      }

      // Emit custom event
      emit(this.container, EVENTS.TASK_CREATED, { task, form: this });

    } catch (error) {
      logError(error, 'TaskForm.handleSubmit');
      this.handleError(error, 'Failed to create task');
    } finally {
      this.setSubmitting(false);
    }
  }

  handleInput(event) {
    if (this.options.validateOnInput) {
      // Debounced validation to avoid excessive validation
      clearTimeout(this.validationTimeout);
      this.validationTimeout = setTimeout(() => {
        this.validateField('title', event.target.value);
      }, 300);
    }

    // Clear errors when user starts typing
    if (event.target.value.trim().length > 0) {
      this.clearErrors();
    }

    // Update submit button state
    this.updateSubmitButton();
  }

  handleKeydown(event) {
    if (event.key === 'Enter' && this.options.submitOnEnter && !event.shiftKey) {
      event.preventDefault();
      this.elements.form.dispatchEvent(new Event('submit'));
    } else if (event.key === 'Escape') {
      this.reset();
      this.elements.input.blur();
    }
  }

  handleInputFocus(event) {
    this.container.classList.add('task-form--focused');
    
    if (this.elements.helpText) {
      this.elements.helpText.style.display = 'block';
    }
  }

  handleInputBlur(event) {
    this.container.classList.remove('task-form--focused');
    
    // Validate on blur if there's content
    if (event.target.value.trim().length > 0) {
      this.validateField('title', event.target.value);
    }
  }

  handlePriorityChange(event) {
    const priority = event.target.value;
    this.container.setAttribute('data-priority', priority);
    
    emit(this.container, EVENTS.FORM_VALIDATE, {
      field: 'priority',
      value: priority,
      isValid: true
    });
  }

  handleSubmitClick(event) {
    // Prevent double submission
    if (this.isSubmitting) {
      event.preventDefault();
    }
  }

  handleEscape(event) {
    if (this.elements.input === document.activeElement) {
      this.reset();
      this.elements.input.blur();
    }
  }

  // === NEW EVENT HANDLERS FOR ADVANCED FEATURES === */
  handleCategoryInput(event) {
    const category = event.target.value.trim();
    emit(this.container, EVENTS.FORM_VALIDATE, {
      field: 'category',
      value: category,
      isValid: true
    });
  }

  handleDueDateChange(event) {
    const dueDate = event.target.value;
    const isValid = !dueDate || new Date(dueDate) >= new Date().setHours(0, 0, 0, 0);
    
    if (!isValid) {
      this.setFieldError('dueDate', 'Due date cannot be in the past');
    } else {
      this.clearFieldError('dueDate');
    }

    emit(this.container, EVENTS.FORM_VALIDATE, {
      field: 'dueDate',
      value: dueDate,
      isValid
    });
  }

  handleAdvancedToggle(event) {
    event.preventDefault();
    const isVisible = this.elements.advancedSection && this.elements.advancedSection.style.display !== 'none';
    
    if (this.elements.advancedSection) {
      this.elements.advancedSection.style.display = isVisible ? 'none' : 'block';
      
      // Update button text/icon
      const buttonText = event.target.querySelector('.btn-text') || event.target;
      if (buttonText.textContent) {
        buttonText.textContent = isVisible ? 'More Options' : 'Fewer Options';
      }
      
      // Update aria-expanded
      event.target.setAttribute('aria-expanded', !isVisible);
    }
  }

  // === FORM DATA MANAGEMENT === */
  getFormData() {
    const formData = {
      title: this.elements.input.value.trim(),
      priority: this.elements.prioritySelect?.value || 'medium'
    };

    // Add advanced fields if present
    if (this.elements.categoryInput?.value.trim()) {
      formData.category = this.elements.categoryInput.value.trim();
    }

    if (this.elements.dueDateInput?.value) {
      formData.dueDate = this.elements.dueDateInput.value;
    }

    return formData;
  }

  setFormData(data) {
    if (data.title !== undefined) {
      this.elements.input.value = data.title;
    }
    
    if (data.priority !== undefined && this.elements.prioritySelect) {
      this.elements.prioritySelect.value = data.priority;
      this.container.setAttribute('data-priority', data.priority);
    }
    
    this.updateSubmitButton();
  }

  reset() {
    this.elements.form.reset();
    this.clearErrors();
    this.container.removeAttribute('data-priority');
    this.container.classList.remove('task-form--focused');
    this.updateSubmitButton();
    
    emit(this.container, EVENTS.FORM_RESET, { form: this });
  }

  // === VALIDATION === */
  setupValidation() {
    // Set up initial validation attributes
    if (this.elements.input) {
      this.elements.input.setAttribute('aria-describedby', 
        [
          this.elements.helpText?.id,
          this.elements.errorContainer?.id
        ].filter(Boolean).join(' ')
      );
    }
  }

  validateForm(formData) {
    const errors = [];
    
    // Validate title
    const titleValidation = validateTaskTitle(formData.title);
    if (!titleValidation.isValid) {
      errors.push(...titleValidation.errors);
    }
    
    // Validate priority
    const priorityValidation = validateTaskPriority(formData.priority);
    if (!priorityValidation.isValid) {
      errors.push(...priorityValidation.errors);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateField(fieldName, value) {
    let validation;
    
    switch (fieldName) {
      case 'title':
        validation = validateTaskTitle(value);
        break;
      case 'priority':
        validation = validateTaskPriority(value);
        break;
      default:
        return { isValid: true, errors: [] };
    }
    
    if (!validation.isValid) {
      this.showValidationErrors(validation.errors);
    } else {
      this.clearErrors();
    }
    
    emit(this.container, EVENTS.FORM_VALIDATE, {
      field: fieldName,
      value,
      isValid: validation.isValid,
      errors: validation.errors
    });
    
    return validation;
  }

  // === UI STATE MANAGEMENT === */
  setSubmitting(submitting) {
    this.isSubmitting = submitting;
    
    if (this.elements.submitButton) {
      this.elements.submitButton.disabled = submitting;
      this.elements.submitButton.setAttribute('aria-busy', submitting);
    }
    
    if (this.elements.input) {
      this.elements.input.disabled = submitting;
    }
    
    if (this.elements.prioritySelect) {
      this.elements.prioritySelect.disabled = submitting;
    }
    
    this.container.classList.toggle('task-form--submitting', submitting);
  }

  updateSubmitButton() {
    if (!this.elements.submitButton) return;
    
    const hasContent = this.elements.input.value.trim().length > 0;
    const isValid = !this.isSubmitting && hasContent;
    
    this.elements.submitButton.disabled = !isValid;
    this.elements.submitButton.classList.toggle('btn--disabled', !isValid);
  }

  // === ERROR HANDLING === */
  showValidationErrors(errors) {
    if (!this.elements.errorContainer || !Array.isArray(errors)) return;
    
    this.elements.errorContainer.innerHTML = '';
    this.elements.errorContainer.style.display = errors.length > 0 ? 'block' : 'none';
    
    if (errors.length > 0) {
      const errorList = document.createElement('ul');
      errorList.className = 'task-form__error-list';
      
      errors.forEach(error => {
        const errorItem = document.createElement('li');
        errorItem.textContent = error;
        errorList.appendChild(errorItem);
      });
      
      this.elements.errorContainer.appendChild(errorList);
      
      // Update ARIA state
      this.elements.input.setAttribute('aria-invalid', 'true');
      this.container.classList.add('task-form--error');
      
      // Announce error to screen readers
      announceToScreenReader(`Form validation error: ${errors[0]}`, 'assertive');
    }
  }

  clearErrors() {
    if (this.elements.errorContainer) {
      this.elements.errorContainer.innerHTML = '';
      this.elements.errorContainer.style.display = 'none';
    }
    
    if (this.elements.input) {
      this.elements.input.removeAttribute('aria-invalid');
    }
    
    this.container.classList.remove('task-form--error');
  }

  handleError(error, userMessage) {
    this.showValidationErrors([userMessage || 'An error occurred']);
    
    emit(document, EVENTS.APP_ERROR, {
      error,
      context: 'TaskForm',
      userMessage,
      timestamp: new Date().toISOString()
    });
  }

  // === PUBLIC API === */
  focus() {
    if (this.elements.input) {
      this.elements.input.focus();
    }
  }

  blur() {
    if (this.elements.input) {
      this.elements.input.blur();
    }
  }

  disable() {
    this.setSubmitting(true);
  }

  enable() {
    this.setSubmitting(false);
  }

  isEmpty() {
    return this.elements.input.value.trim().length === 0;
  }

  isValid() {
    const formData = this.getFormData();
    const validation = this.validateForm(formData);
    return validation.isValid;
  }

  getContainer() {
    return this.container;
  }

  // === CLEANUP === */
  destroy() {
    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    // Clear timeouts
    clearTimeout(this.validationTimeout);

    // Reset state
    this.isSubmitting = false;
    this.elements = {};

    emit(document, EVENTS.COMPONENT_UNMOUNTED, {
      component: 'TaskForm',
      container: this.container
    });
  }
}

// === FACTORY FUNCTION === */
export function createTaskForm(container, options) {
  return new TaskForm(container, options);
}

// === AUTO-INITIALIZATION === */
export function initTaskForms(selector = '.task-form-section') {
  const containers = document.querySelectorAll(selector);
  const forms = [];
  
  containers.forEach(container => {
    try {
      const form = new TaskForm(container);
      forms.push(form);
    } catch (error) {
      logError(error, `Failed to initialize TaskForm in container: ${container}`);
    }
  });
  
  return forms;
}