---
title: Project Structure & Organization
description: "Defines file organization, naming conventions, and architectural guidelines."
inclusion: always
---

# Project Structure & Organization

## Directory Structure

```
/
├── index.html                 # Main application entry point
├── favicon.ico               # Application favicon
├── manifest.json             # PWA manifest file
├── .ai-rules/                # AI agent steering files
│   ├── product.md
│   ├── tech.md
│   └── structure.md
├── css/                      # Stylesheets
│   ├── main.css             # Core application styles
│   ├── reset.css            # CSS reset/normalize
│   ├── variables.css        # CSS custom properties
│   ├── components/          # Component-specific styles
│   │   ├── task-item.css
│   │   ├── task-list.css
│   │   ├── header.css
│   │   ├── sidebar.css
│   │   ├── modal.css
│   │   └── buttons.css
│   ├── layouts/             # Layout-specific styles
│   │   ├── grid.css
│   │   └── responsive.css
│   └── themes/              # Theme variations
│       ├── light.css
│       └── dark.css
├── js/                       # JavaScript modules
│   ├── app.js               # Main application entry
│   ├── config.js            # Application configuration
│   ├── modules/             # Core feature modules
│   │   ├── taskManager.js
│   │   ├── storage.js
│   │   ├── search.js
│   │   ├── filters.js
│   │   ├── themes.js
│   │   └── collaboration.js
│   ├── components/          # Reusable UI components
│   │   ├── TaskItem.js
│   │   ├── TaskList.js
│   │   ├── TaskForm.js
│   │   ├── SearchBar.js
│   │   ├── FilterPanel.js
│   │   ├── Modal.js
│   │   └── Notification.js
│   ├── utils/               # Utility functions
│   │   ├── dom.js
│   │   ├── validation.js
│   │   ├── dateUtils.js
│   │   ├── storage.js
│   │   └── helpers.js
│   └── constants/           # Application constants
│       ├── events.js
│       ├── selectors.js
│       └── config.js
├── assets/                   # Static assets
│   ├── icons/               # SVG icons
│   │   ├── task.svg
│   │   ├── plus.svg
│   │   ├── check.svg
│   │   ├── delete.svg
│   │   ├── edit.svg
│   │   ├── search.svg
│   │   ├── filter.svg
│   │   ├── sun.svg
│   │   └── moon.svg
│   ├── images/              # Application images
│   │   └── placeholder.svg
│   └── fonts/               # Custom fonts (if needed)
├── data/                    # Development and mock data
│   ├── mockTasks.js         # Sample task data
│   └── schema.js            # Data structure definitions
├── docs/                    # Documentation
│   ├── README.md            # Project documentation
│   ├── api.md               # Component API documentation
│   ├── deployment.md        # Deployment instructions
│   └── contributing.md      # Contribution guidelines
├── tests/                   # Test files (if implemented)
│   ├── unit/
│   └── integration/
└── .gitignore               # Git ignore rules
```

## File Naming Conventions

### General Rules
- Use **kebab-case** for file and directory names
- Use descriptive, meaningful names
- Avoid abbreviations unless universally understood
- Include file type in name when helpful (`mock-tasks.js`, `task-schema.js`)

### Specific Conventions

#### HTML Files
- `index.html` - Main application entry point
- Use `.html` extension for all HTML files
- Name pages by their primary function (`settings.html`, `help.html`)

#### CSS Files
- `main.css` - Primary application styles
- `reset.css` - CSS reset/normalize
- `variables.css` - CSS custom properties
- Component files: `component-name.css`
- Theme files: `theme-name.css`

#### JavaScript Files
- `app.js` - Main application entry point
- PascalCase for component classes: `TaskItem.js`, `TaskList.js`
- camelCase for modules: `taskManager.js`, `searchUtils.js`
- Constants files: `events.js`, `config.js`

#### Asset Files
- SVG icons: descriptive names (`plus-icon.svg`, `check-mark.svg`)
- Images: descriptive names with context (`empty-state-illustration.svg`)

## Component Organization

### JavaScript Components

#### Component Structure
```javascript
// TaskItem.js - Example component structure
class TaskItem {
  constructor(taskData, options = {}) {
    this.taskData = taskData;
    this.options = options;
    this.element = null;
    this.init();
  }

  init() {
    this.createElement();
    this.bindEvents();
  }

  createElement() {
    // Create DOM element
  }

  bindEvents() {
    // Bind event listeners
  }

  render() {
    // Render component
  }

  destroy() {
    // Cleanup
  }
}
```

#### Module Structure
```javascript
// taskManager.js - Example module structure
const TaskManager = {
  tasks: [],
  
  init() {
    // Initialize module
  },
  
  createTask(taskData) {
    // Create task logic
  },
  
  updateTask(taskId, updates) {
    // Update task logic
  },
  
  deleteTask(taskId) {
    // Delete task logic
  }
};
```

### CSS Component Organization

#### Component CSS Structure
```css
/* task-item.css - Example component styles */

/* Block */
.task-item {
  /* Base component styles */
}

/* Elements */
.task-item__content {
  /* Content area styles */
}

.task-item__title {
  /* Title styles */
}

.task-item__actions {
  /* Actions area styles */
}

/* Modifiers */
.task-item--completed {
  /* Completed state styles */
}

.task-item--high-priority {
  /* High priority variant */
}
```

## Data Architecture

### Task Data Structure
```javascript
// Task schema
const TaskSchema = {
  id: 'string',           // Unique identifier
  title: 'string',        // Task title (required)
  description: 'string',  // Task description (optional)
  completed: 'boolean',   // Completion status
  priority: 'string',     // 'low', 'medium', 'high'
  dueDate: 'date',        // Due date (optional)
  createdAt: 'date',      // Creation timestamp
  updatedAt: 'date',      // Last update timestamp
  category: 'string',     // Task category (optional)
  tags: 'array'           // Array of tag strings
};
```

### Storage Structure
```javascript
// Local storage organization
const StorageKeys = {
  TASKS: 'todoapp_tasks',
  SETTINGS: 'todoapp_settings',
  THEME: 'todoapp_theme',
  FILTERS: 'todoapp_filters'
};
```

## Integration Guidelines

### Sub-Agent Responsibilities

#### Frontend Structure Agent
- Responsible for HTML structure and semantic markup
- Creates basic layout and accessibility features
- Establishes responsive grid system

#### Styling Agent
- Implements CSS architecture and visual design
- Creates component styles and theme system
- Ensures responsive design and animations

#### Functionality Agent
- Implements core JavaScript functionality
- Creates task management logic and data handling
- Builds interactive features and user interactions

#### Enhancement Agent
- Adds advanced features like search and filtering
- Implements collaboration features
- Optimizes performance and accessibility

### Component Interface Standards

#### Public API Requirements
- Each component must expose a consistent public API
- Document all public methods and properties
- Use events for component communication
- Implement proper cleanup methods

#### Event System
```javascript
// Standard event naming
const Events = {
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  FILTER_CHANGED: 'filter:changed',
  THEME_CHANGED: 'theme:changed'
};
```

#### Data Flow
- Components communicate through events
- Centralized state management through TaskManager
- Read-only data passed to components
- Updates flow through the manager

## Development Coordination

### Feature Integration Process
1. Create feature branch with descriptive name
2. Implement feature following established patterns
3. Test integration with existing components
4. Update documentation
5. Create pull request for review

### Code Quality Standards
- Follow established naming conventions
- Maintain consistent code formatting
- Include comments for complex logic
- Ensure accessibility compliance
- Test across target browsers

### Conflict Resolution
- Use consistent APIs between components
- Coordinate on shared utility functions
- Maintain backward compatibility
- Document breaking changes clearly