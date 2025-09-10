/* Input Validation Utilities */

import { sanitizeHtml } from './helpers.js';

// === VALIDATION RESULT INTERFACE === */
export class ValidationResult {
  constructor(isValid = true, errors = [], sanitizedValue = null) {
    this.isValid = isValid;
    this.errors = errors;
    this.sanitizedValue = sanitizedValue;
  }
  
  addError(error) {
    this.errors.push(error);
    this.isValid = false;
  }
  
  hasErrors() {
    return this.errors.length > 0;
  }
  
  getFirstError() {
    return this.errors[0] || null;
  }
}

// === TASK VALIDATION === */
export class TaskValidator {
  static validateTitle(title) {
    const result = new ValidationResult();
    const errors = [];
    
    // Check if title exists and is a string
    if (!title || typeof title !== 'string') {
      errors.push('Task title is required and must be text');
      return new ValidationResult(false, errors, '');
    }
    
    // Trim whitespace
    const trimmed = title.trim();
    
    // Check if empty after trimming
    if (trimmed.length === 0) {
      errors.push('Task title cannot be empty');
      return new ValidationResult(false, errors, '');
    }
    
    // Check minimum length
    if (trimmed.length < 1) {
      errors.push('Task title must be at least 1 character long');
    }
    
    // Check maximum length
    if (trimmed.length > 500) {
      errors.push('Task title must be less than 500 characters');
    }
    
    // Check for dangerous patterns
    if (this.containsDangerousContent(trimmed)) {
      errors.push('Task title contains invalid characters');
    }
    
    // Sanitize the input
    const sanitized = sanitizeHtml(trimmed);
    
    return new ValidationResult(errors.length === 0, errors, sanitized);
  }
  
  static validatePriority(priority) {
    const validPriorities = ['low', 'medium', 'high'];
    const result = new ValidationResult();
    
    if (!priority) {
      return new ValidationResult(true, [], 'medium'); // Default priority
    }
    
    if (!validPriorities.includes(priority)) {
      result.addError(`Priority must be one of: ${validPriorities.join(', ')}`);
      return result;
    }
    
    result.sanitizedValue = priority;
    return result;
  }
  
  static validateTask(taskData) {
    const result = new ValidationResult();
    const sanitizedTask = {};
    
    // Validate title
    const titleValidation = this.validateTitle(taskData.title);
    if (!titleValidation.isValid) {
      result.errors.push(...titleValidation.errors);
    } else {
      sanitizedTask.title = titleValidation.sanitizedValue;
    }
    
    // Validate priority
    const priorityValidation = this.validatePriority(taskData.priority);
    if (!priorityValidation.isValid) {
      result.errors.push(...priorityValidation.errors);
    } else {
      sanitizedTask.priority = priorityValidation.sanitizedValue;
    }
    
    // Validate completed status
    if (taskData.completed !== undefined) {
      if (typeof taskData.completed !== 'boolean') {
        result.addError('Completed status must be true or false');
      } else {
        sanitizedTask.completed = taskData.completed;
      }
    }
    
    // Validate dates if provided
    if (taskData.createdAt) {
      const dateValidation = this.validateDate(taskData.createdAt);
      if (!dateValidation.isValid) {
        result.errors.push(...dateValidation.errors);
      } else {
        sanitizedTask.createdAt = dateValidation.sanitizedValue;
      }
    }
    
    if (taskData.updatedAt) {
      const dateValidation = this.validateDate(taskData.updatedAt);
      if (!dateValidation.isValid) {
        result.errors.push(...dateValidation.errors);
      } else {
        sanitizedTask.updatedAt = dateValidation.sanitizedValue;
      }
    }
    
    result.isValid = result.errors.length === 0;
    result.sanitizedValue = sanitizedTask;
    
    return result;
  }
  
  static validateDate(date) {
    const result = new ValidationResult();
    
    if (!date) {
      result.addError('Date is required');
      return result;
    }
    
    let dateObj;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      result.addError('Date must be a valid Date object, string, or timestamp');
      return result;
    }
    
    if (isNaN(dateObj.getTime())) {
      result.addError('Date is not valid');
      return result;
    }
    
    // Check if date is not too far in the future (prevent abuse)
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
    
    if (dateObj > maxFutureDate) {
      result.addError('Date cannot be more than 1 year in the future');
      return result;
    }
    
    // Check if date is not too far in the past
    const minPastDate = new Date('1900-01-01');
    
    if (dateObj < minPastDate) {
      result.addError('Date cannot be before 1900');
      return result;
    }
    
    result.sanitizedValue = dateObj;
    return result;
  }
  
  static containsDangerousContent(str) {
    // Check for potential XSS patterns
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /<link/gi,
      /<meta/gi
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(str));
  }
}

// === SEARCH VALIDATION === */
export class SearchValidator {
  static validateQuery(query) {
    const result = new ValidationResult();
    
    if (!query || typeof query !== 'string') {
      result.sanitizedValue = '';
      return result;
    }
    
    const trimmed = query.trim();
    
    // Check maximum length
    if (trimmed.length > 200) {
      result.addError('Search query must be less than 200 characters');
      return result;
    }
    
    // Basic sanitization
    const sanitized = sanitizeHtml(trimmed);
    
    result.sanitizedValue = sanitized;
    return result;
  }
  
  static validateFilters(filters) {
    const result = new ValidationResult();
    const sanitizedFilters = {};
    
    if (!filters || typeof filters !== 'object') {
      result.sanitizedValue = {
        status: 'all',
        priority: 'all',
        searchQuery: ''
      };
      return result;
    }
    
    // Validate status filter
    const validStatuses = ['all', 'active', 'completed'];
    if (filters.status && !validStatuses.includes(filters.status)) {
      result.addError(`Status filter must be one of: ${validStatuses.join(', ')}`);
    } else {
      sanitizedFilters.status = filters.status || 'all';
    }
    
    // Validate priority filter
    const validPriorities = ['all', 'low', 'medium', 'high'];
    if (filters.priority && !validPriorities.includes(filters.priority)) {
      result.addError(`Priority filter must be one of: ${validPriorities.join(', ')}`);
    } else {
      sanitizedFilters.priority = filters.priority || 'all';
    }
    
    // Validate search query
    const queryValidation = this.validateQuery(filters.searchQuery);
    if (!queryValidation.isValid) {
      result.errors.push(...queryValidation.errors);
    } else {
      sanitizedFilters.searchQuery = queryValidation.sanitizedValue;
    }
    
    result.isValid = result.errors.length === 0;
    result.sanitizedValue = sanitizedFilters;
    
    return result;
  }
}

// === FORM VALIDATION === */
export class FormValidator {
  constructor(form) {
    this.form = form;
    this.validators = new Map();
    this.errors = new Map();
  }
  
  addValidator(fieldName, validatorFn) {
    this.validators.set(fieldName, validatorFn);
    return this;
  }
  
  validate() {
    this.errors.clear();
    let isValid = true;
    
    const formData = new FormData(this.form);
    
    for (const [fieldName, validator] of this.validators) {
      const value = formData.get(fieldName);
      const result = validator(value);
      
      if (!result.isValid) {
        this.errors.set(fieldName, result.errors);
        isValid = false;
      }
    }
    
    return {
      isValid,
      errors: Object.fromEntries(this.errors),
      hasErrors: () => this.errors.size > 0,
      getFieldErrors: (field) => this.errors.get(field) || [],
      clearErrors: () => this.errors.clear()
    };
  }
  
  showErrors() {
    // Clear previous errors
    this.clearErrorMessages();
    
    for (const [fieldName, errors] of this.errors) {
      const field = this.form.querySelector(`[name="${fieldName}"]`);
      const errorContainer = this.form.querySelector(`#${fieldName}-error`);
      
      if (field) {
        field.classList.add('error');
        field.setAttribute('aria-invalid', 'true');
      }
      
      if (errorContainer && errors.length > 0) {
        errorContainer.textContent = errors[0];
        errorContainer.style.display = 'block';
      }
    }
  }
  
  clearErrors() {
    this.errors.clear();
    this.clearErrorMessages();
  }
  
  clearErrorMessages() {
    // Remove error classes and messages
    const errorFields = this.form.querySelectorAll('.error');
    errorFields.forEach(field => {
      field.classList.remove('error');
      field.removeAttribute('aria-invalid');
    });
    
    const errorContainers = this.form.querySelectorAll('[id$="-error"]');
    errorContainers.forEach(container => {
      container.textContent = '';
      container.style.display = 'none';
    });
  }
}

// === BULK VALIDATION === */
export class BulkValidator {
  static validateTaskList(tasks) {
    const results = [];
    const errors = [];
    
    if (!Array.isArray(tasks)) {
      return new ValidationResult(false, ['Tasks must be provided as an array'], []);
    }
    
    tasks.forEach((task, index) => {
      const validation = TaskValidator.validateTask(task);
      results.push(validation);
      
      if (!validation.isValid) {
        errors.push(`Task ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });
    
    const allValid = results.every(r => r.isValid);
    const sanitizedTasks = results.map(r => r.sanitizedValue).filter(Boolean);
    
    return new ValidationResult(allValid, errors, sanitizedTasks);
  }
  
  static validateIds(ids) {
    const result = new ValidationResult();
    
    if (!Array.isArray(ids)) {
      result.addError('IDs must be provided as an array');
      return result;
    }
    
    const validIds = [];
    const errors = [];
    
    ids.forEach((id, index) => {
      if (!id || typeof id !== 'string') {
        errors.push(`ID at position ${index + 1} is invalid`);
      } else if (id.trim().length === 0) {
        errors.push(`ID at position ${index + 1} cannot be empty`);
      } else {
        validIds.push(id.trim());
      }
    });
    
    if (errors.length > 0) {
      result.errors.push(...errors);
      result.isValid = false;
    }
    
    result.sanitizedValue = validIds;
    return result;
  }
}

// === EXPORT VALIDATION === */
export class ExportValidator {
  static validateExportData(data) {
    const result = new ValidationResult();
    
    if (!data || typeof data !== 'object') {
      result.addError('Export data must be an object');
      return result;
    }
    
    // Validate tasks array
    if (!data.tasks || !Array.isArray(data.tasks)) {
      result.addError('Export data must contain a tasks array');
      return result;
    }
    
    // Validate each task
    const tasksValidation = BulkValidator.validateTaskList(data.tasks);
    if (!tasksValidation.isValid) {
      result.errors.push(...tasksValidation.errors);
    }
    
    // Validate metadata if present
    if (data.metadata) {
      if (typeof data.metadata !== 'object') {
        result.addError('Metadata must be an object');
      } else {
        // Validate export timestamp
        if (data.metadata.exportedAt) {
          const dateValidation = TaskValidator.validateDate(data.metadata.exportedAt);
          if (!dateValidation.isValid) {
            result.errors.push('Invalid export timestamp');
          }
        }
      }
    }
    
    result.isValid = result.errors.length === 0;
    result.sanitizedValue = {
      tasks: tasksValidation.sanitizedValue || [],
      metadata: data.metadata || {}
    };
    
    return result;
  }
}

// === UTILITY FUNCTIONS === */
export function createFieldValidator(validators) {
  return function(value) {
    const result = new ValidationResult();
    result.sanitizedValue = value;
    
    for (const validator of validators) {
      const validationResult = validator(value);
      if (!validationResult.isValid) {
        result.errors.push(...validationResult.errors);
        result.isValid = false;
      }
      if (validationResult.sanitizedValue !== undefined) {
        result.sanitizedValue = validationResult.sanitizedValue;
      }
    }
    
    return result;
  };
}

export function required(message = 'This field is required') {
  return function(value) {
    const result = new ValidationResult();
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      result.addError(message);
    }
    result.sanitizedValue = value;
    return result;
  };
}

export function minLength(min, message) {
  return function(value) {
    const result = new ValidationResult();
    if (value && value.length < min) {
      result.addError(message || `Must be at least ${min} characters long`);
    }
    result.sanitizedValue = value;
    return result;
  };
}

export function maxLength(max, message) {
  return function(value) {
    const result = new ValidationResult();
    if (value && value.length > max) {
      result.addError(message || `Must be no more than ${max} characters long`);
    }
    result.sanitizedValue = value;
    return result;
  };
}

export function pattern(regex, message) {
  return function(value) {
    const result = new ValidationResult();
    if (value && !regex.test(value)) {
      result.addError(message || 'Invalid format');
    }
    result.sanitizedValue = value;
    return result;
  };
}

// === CONVENIENCE FUNCTIONS === */
export function validateTaskTitle(title) {
  return TaskValidator.validateTitle(title);
}

export function validateTaskPriority(priority) {
  return TaskValidator.validatePriority(priority);
}

export function validateTask(taskData) {
  return TaskValidator.validateTask(taskData);
}

export function validateSearchQuery(query) {
  return SearchValidator.validateQuery(query);
}

export function validateFilters(filters) {
  return SearchValidator.validateFilters(filters);
}