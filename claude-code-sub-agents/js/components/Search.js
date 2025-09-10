/* Search Component */

import { EVENTS } from '../constants/events.js';
import { SELECTORS } from '../constants/selectors.js';
import { debounce, on, off, emit, logError, announceToScreenReader } from '../utils/helpers.js';
import { validateSearchQuery } from '../utils/validation.js';
import { getStateManager } from '../modules/stateManager.js';

// === SEARCH COMPONENT === */
export class Search {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      debounceDelay: 300,
      minQueryLength: 1,
      enableKeyboardShortcuts: true,
      showClearButton: true,
      announceResults: true,
      ...options
    };

    this.state = getStateManager();
    this.elements = {};
    this.listeners = [];
    this.currentQuery = '';
    this.isActive = false;
    
    // Debounced search function
    this.debouncedSearch = debounce(this.performSearch.bind(this), this.options.debounceDelay);
    
    this.init();
  }

  // === INITIALIZATION === */
  init() {
    try {
      if (!this.container) {
        throw new Error('Search container not found');
      }

      this.findElements();
      this.attachEventListeners();
      this.subscribeToStateChanges();
      this.updateDisplay();

      emit(document, EVENTS.COMPONENT_MOUNTED, {
        component: 'Search',
        container: this.container
      });

    } catch (error) {
      logError(error, 'Search.init');
      this.handleError(error, 'Failed to initialize search');
    }
  }

  // === DOM ELEMENT DISCOVERY === */
  findElements() {
    this.elements = {
      input: this.container.querySelector('#search-input') || this.container.querySelector('input[type="search"]'),
      clearButton: this.container.querySelector('.search-bar__clear'),
      helpText: this.container.querySelector('#search-help'),
      resultsIndicator: this.container.querySelector('.search-results-indicator')
    };

    if (!this.elements.input) {
      throw new Error('Search input element not found');
    }
  }

  // === EVENT LISTENERS === */
  attachEventListeners() {
    // Search input events
    this.addListener(this.elements.input, 'input', this.handleInput.bind(this));
    this.addListener(this.elements.input, 'keydown', this.handleKeydown.bind(this));
    this.addListener(this.elements.input, 'focus', this.handleFocus.bind(this));
    this.addListener(this.elements.input, 'blur', this.handleBlur.bind(this));
    
    // Clear button
    if (this.elements.clearButton) {
      this.addListener(this.elements.clearButton, 'click', this.handleClear.bind(this));
    }
    
    // Global keyboard shortcuts
    if (this.options.enableKeyboardShortcuts) {
      this.addListener(document, 'keydown', this.handleGlobalKeyboard.bind(this));
    }
    
    // Global search events
    this.addListener(document, EVENTS.SEARCH_CLEARED, this.handleSearchCleared.bind(this));
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  subscribeToStateChanges() {
    // Subscribe to state changes to update UI
    this.unsubscribeFromState = this.state.subscribe((newState, prevState, source) => {
      // Update search query if changed externally
      if (newState.filters.searchQuery !== this.currentQuery) {
        this.updateSearchQuery(newState.filters.searchQuery, false);
      }
    });
  }

  // === EVENT HANDLERS === */
  handleInput(event) {
    const query = event.target.value;
    this.currentQuery = query;
    
    // Update clear button visibility
    this.updateClearButton();
    
    // Perform debounced search
    this.debouncedSearch(query);
    
    // Update active state
    this.updateActiveState(query.length > 0);
  }

  handleKeydown(event) {
    switch (event.key) {
      case 'Escape':
        this.clear();
        this.elements.input.blur();
        break;
      case 'Enter':
        // Prevent form submission if inside a form
        event.preventDefault();
        // Force immediate search
        this.performSearch(this.currentQuery);
        break;
    }
  }

  handleFocus(event) {
    this.container.classList.add('search-bar--focused');
    
    if (this.elements.helpText) {
      this.elements.helpText.style.display = 'block';
    }
    
    emit(this.container, EVENTS.SEARCH_FOCUSED, {
      query: this.currentQuery
    });
  }

  handleBlur(event) {
    this.container.classList.remove('search-bar--focused');
    
    if (this.elements.helpText && !this.currentQuery) {
      this.elements.helpText.style.display = 'none';
    }
    
    emit(this.container, EVENTS.SEARCH_BLURRED, {
      query: this.currentQuery
    });
  }

  handleClear(event) {
    event.preventDefault();
    this.clear();
    this.elements.input.focus();
  }

  handleGlobalKeyboard(event) {
    // Handle global search shortcut (/ key)
    if (event.key === '/' && !this.isInputFocused()) {
      event.preventDefault();
      this.focus();
    }
    
    // Handle Ctrl/Cmd + F
    if ((event.ctrlKey || event.metaKey) && event.key === 'f' && !this.isInputFocused()) {
      event.preventDefault();
      this.focus();
    }
  }

  handleSearchCleared(event) {
    this.clear();
  }

  // === SEARCH FUNCTIONALITY === */
  async performSearch(query) {
    try {
      // Validate search query
      const validation = validateSearchQuery(query);
      if (!validation.isValid) {
        this.showValidationError(validation.errors[0]);
        return;
      }
      
      const sanitizedQuery = validation.sanitizedValue;
      
      // Update state with search query
      this.state.setFilter('searchQuery', sanitizedQuery);
      
      // Get current task count for results
      const filteredTasks = this.state.getFilteredTasks();
      const resultCount = filteredTasks.length;
      
      // Update results indicator
      this.updateResultsIndicator(resultCount, sanitizedQuery);
      
      // Announce results to screen reader
      if (this.options.announceResults && sanitizedQuery.length > 0) {
        const message = resultCount === 0 
          ? `No tasks found for "${sanitizedQuery}"`
          : `${resultCount} task${resultCount !== 1 ? 's' : ''} found for "${sanitizedQuery}"`;
        announceToScreenReader(message);
      }
      
      // Emit search event
      emit(document, EVENTS.SEARCH_QUERY_CHANGED, {
        query: sanitizedQuery,
        resultCount,
        timestamp: new Date().toISOString()
      });
      
      emit(this.container, EVENTS.SEARCH_RESULTS_UPDATED, {
        query: sanitizedQuery,
        resultCount,
        tasks: filteredTasks
      });
      
    } catch (error) {
      logError(error, 'Search.performSearch');
      this.handleError(error, 'Search failed');
    }
  }

  // === UI UPDATES === */
  updateSearchQuery(query, triggerSearch = true) {
    this.currentQuery = query;
    this.elements.input.value = query;
    
    this.updateClearButton();
    this.updateActiveState(query.length > 0);
    
    if (triggerSearch) {
      this.debouncedSearch(query);
    }
  }

  updateClearButton() {
    if (!this.elements.clearButton) return;
    
    const showClear = this.currentQuery.length > 0;
    this.elements.clearButton.style.display = showClear ? 'block' : 'none';
    this.elements.clearButton.setAttribute('aria-hidden', showClear ? 'false' : 'true');
  }

  updateActiveState(isActive) {
    this.isActive = isActive;
    this.container.classList.toggle('search-bar--active', isActive);
    
    // Update input ARIA state
    this.elements.input.setAttribute('aria-expanded', isActive ? 'true' : 'false');
  }

  updateResultsIndicator(count, query) {
    if (!this.elements.resultsIndicator) return;
    
    if (query.length === 0) {
      this.elements.resultsIndicator.style.display = 'none';
      return;
    }
    
    this.elements.resultsIndicator.style.display = 'block';
    this.elements.resultsIndicator.textContent = count === 0 
      ? 'No results'
      : `${count} result${count !== 1 ? 's' : ''}`;
    
    // Update accessibility
    this.elements.resultsIndicator.setAttribute('aria-live', 'polite');
    this.elements.resultsIndicator.setAttribute('role', 'status');
  }

  updateDisplay() {
    // Sync with current state
    const currentState = this.state.getState();
    const currentQuery = currentState.filters.searchQuery;
    
    if (currentQuery !== this.currentQuery) {
      this.updateSearchQuery(currentQuery, false);
    }
    
    // Update results indicator
    const filteredTasks = this.state.getFilteredTasks();
    this.updateResultsIndicator(filteredTasks.length, currentQuery);
  }

  // === VALIDATION === */
  showValidationError(message) {
    // Add error styling
    this.elements.input.classList.add('error');
    this.elements.input.setAttribute('aria-invalid', 'true');
    
    // Show error message
    announceToScreenReader(`Search error: ${message}`, 'assertive');
    
    // Auto-remove error styling
    setTimeout(() => {
      this.elements.input.classList.remove('error');
      this.elements.input.removeAttribute('aria-invalid');
    }, 3000);
  }

  // === PUBLIC API === */
  focus() {
    if (this.elements.input) {
      this.elements.input.focus();
      this.elements.input.select();
    }
  }

  blur() {
    if (this.elements.input) {
      this.elements.input.blur();
    }
  }

  clear() {
    this.currentQuery = '';
    this.elements.input.value = '';
    this.updateClearButton();
    this.updateActiveState(false);
    
    // Clear search in state
    this.state.setFilter('searchQuery', '');
    
    // Update results indicator
    this.updateResultsIndicator(0, '');
    
    // Emit clear event
    emit(document, EVENTS.SEARCH_CLEARED, {
      timestamp: new Date().toISOString()
    });
    
    emit(this.container, EVENTS.SEARCH_CLEARED, {});
    
    if (this.options.announceResults) {
      announceToScreenReader('Search cleared');
    }
  }

  setQuery(query) {
    this.updateSearchQuery(query, true);
  }

  getQuery() {
    return this.currentQuery;
  }

  isEmpty() {
    return this.currentQuery.length === 0;
  }

  isInputFocused() {
    return document.activeElement === this.elements.input;
  }

  getContainer() {
    return this.container;
  }

  // === SEARCH SUGGESTIONS (Future Enhancement) === */
  getSuggestions(query) {
    // Placeholder for future search suggestions functionality
    // Could suggest recent searches, task titles, etc.
    return [];
  }

  // === SEARCH HISTORY (Future Enhancement) === */
  addToHistory(query) {
    // Placeholder for search history functionality
    if (query.trim().length === 0) return;
    
    // Could store in localStorage for persistence
    const history = this.getSearchHistory();
    const updatedHistory = [query, ...history.filter(item => item !== query)].slice(0, 10);
    
    try {
      localStorage.setItem('todoapp_search_history', JSON.stringify(updatedHistory));
    } catch (error) {
      // Ignore storage errors
    }
  }

  getSearchHistory() {
    try {
      const history = localStorage.getItem('todoapp_search_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      return [];
    }
  }

  clearSearchHistory() {
    try {
      localStorage.removeItem('todoapp_search_history');
    } catch (error) {
      // Ignore storage errors
    }
  }

  // === ERROR HANDLING === */
  handleError(error, userMessage) {
    emit(document, EVENTS.APP_ERROR, {
      error,
      context: 'Search',
      userMessage,
      timestamp: new Date().toISOString()
    });

    // Show user-friendly notification
    this.state.showNotification(
      userMessage || 'Search encountered an error',
      'error',
      { autoHide: true, duration: 3000 }
    );
  }

  // === CLEANUP === */
  destroy() {
    // Unsubscribe from state
    if (this.unsubscribeFromState) {
      this.unsubscribeFromState();
    }

    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    // Clear search state
    this.clear();

    emit(document, EVENTS.COMPONENT_UNMOUNTED, {
      component: 'Search',
      container: this.container
    });
  }
}

// === FACTORY FUNCTION === */
export function createSearch(container, options) {
  return new Search(container, options);
}

// === AUTO-INITIALIZATION === */
export function initSearchComponents(selector = '.search-bar') {
  const containers = document.querySelectorAll(selector);
  const searchComponents = [];
  
  containers.forEach(container => {
    try {
      const search = new Search(container);
      searchComponents.push(search);
    } catch (error) {
      logError(error, `Failed to initialize Search in container: ${container}`);
    }
  });
  
  return searchComponents;
}

// === SEARCH UTILITIES === */
export class SearchUtils {
  static highlightMatches(text, query) {
    if (!query || query.trim().length === 0) return text;
    
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }
  
  static normalizeQuery(query) {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }
  
  static parseSearchQuery(query) {
    // Basic query parsing for future enhancements
    // Could support operators like priority:high, completed:true, etc.
    const normalized = this.normalizeQuery(query);
    
    return {
      text: normalized,
      filters: {},
      operators: []
    };
  }
}