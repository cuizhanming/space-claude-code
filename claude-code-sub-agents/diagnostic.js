// Comprehensive diagnostic script for todo app
(function() {
    console.log('=== TODO APP DIAGNOSTIC STARTING ===');
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
        console.log('Not running in browser environment');
        return;
    }
    
    const diagnostics = {
        localStorage: false,
        currentTasks: [],
        errors: [],
        modules: {},
        components: {},
        events: [],
        domElements: {}
    };
    
    // Capture all console output
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = function(...args) {
        diagnostics.events.push({type: 'log', message: args.join(' '), timestamp: Date.now()});
        originalLog.apply(console, args);
    };
    
    console.error = function(...args) {
        diagnostics.errors.push({type: 'error', message: args.join(' '), timestamp: Date.now()});
        originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
        diagnostics.errors.push({type: 'warn', message: args.join(' '), timestamp: Date.now()});
        originalWarn.apply(console, args);
    };
    
    // Test localStorage
    function testLocalStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            diagnostics.localStorage = true;
            
            // Check current todo app storage
            const keys = ['todoapp_tasks', 'todoapp_settings', 'todoapp_ui_state'];
            keys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    try {
                        diagnostics.currentTasks = key === 'todoapp_tasks' ? JSON.parse(value) : diagnostics.currentTasks;
                    } catch (e) {
                        diagnostics.errors.push({type: 'storage', message: `Invalid JSON in ${key}: ${e.message}`});
                    }
                }
            });
        } catch (e) {
            diagnostics.localStorage = false;
            diagnostics.errors.push({type: 'storage', message: 'localStorage not available: ' + e.message});
        }
    }
    
    // Test DOM elements
    function testDOMElements() {
        const elements = {
            'task-form': '#task-form',
            'task-input': '#task-input',
            'task-list': '#task-list',
            'search-input': '#search-input',
            'priority-select': '#priority-select',
            'submit-button': '.task-form__submit'
        };
        
        Object.entries(elements).forEach(([name, selector]) => {
            const element = document.querySelector(selector);
            diagnostics.domElements[name] = {
                exists: !!element,
                selector: selector,
                tagName: element ? element.tagName : null,
                id: element ? element.id : null,
                classes: element ? Array.from(element.classList) : []
            };
        });
    }
    
    // Test modules and globals
    function testModules() {
        const globals = ['TodoApp', 'testResults'];
        globals.forEach(name => {
            diagnostics.modules[name] = typeof window[name] !== 'undefined';
        });
    }
    
    // Test task creation manually
    function testTaskCreation() {
        const form = document.getElementById('task-form');
        const input = document.getElementById('task-input');
        
        if (!form || !input) {
            diagnostics.errors.push({type: 'dom', message: 'Form or input elements not found'});
            return false;
        }
        
        try {
            // Simulate user input
            input.value = 'Diagnostic Test Task ' + Date.now();
            
            // Trigger input event
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Wait a bit then submit
            setTimeout(() => {
                form.dispatchEvent(new Event('submit', { bubbles: true }));
                
                // Check result after a delay
                setTimeout(() => {
                    const taskList = document.getElementById('task-list');
                    const taskItems = taskList ? taskList.children.length : 0;
                    diagnostics.taskCreationTest = {
                        attempted: true,
                        taskItemsAfter: taskItems,
                        inputValue: input.value
                    };
                    
                    finalReport();
                }, 1000);
            }, 500);
            
            return true;
        } catch (e) {
            diagnostics.errors.push({type: 'taskCreation', message: 'Task creation failed: ' + e.message});
            return false;
        }
    }
    
    // Generate final diagnostic report
    function finalReport() {
        console.log('\n=== DIAGNOSTIC REPORT ===');
        
        console.log('\n--- Basic Environment ---');
        console.log('localStorage available:', diagnostics.localStorage);
        console.log('Current stored tasks:', Array.isArray(diagnostics.currentTasks) ? diagnostics.currentTasks.length : 'Not an array');
        
        console.log('\n--- DOM Elements ---');
        Object.entries(diagnostics.domElements).forEach(([name, info]) => {
            console.log(`${name}: ${info.exists ? '✓' : '✗'} (${info.selector})`);
        });
        
        console.log('\n--- Global Objects ---');
        Object.entries(diagnostics.modules).forEach(([name, exists]) => {
            console.log(`${name}: ${exists ? '✓' : '✗'}`);
        });
        
        if (diagnostics.taskCreationTest) {
            console.log('\n--- Task Creation Test ---');
            console.log('Attempted:', diagnostics.taskCreationTest.attempted);
            console.log('Tasks in DOM after:', diagnostics.taskCreationTest.taskItemsAfter);
            console.log('Input value:', diagnostics.taskCreationTest.inputValue);
        }
        
        if (diagnostics.errors.length > 0) {
            console.log('\n--- Errors Found ---');
            diagnostics.errors.forEach((error, i) => {
                console.log(`${i + 1}. [${error.type}] ${error.message}`);
            });
        }
        
        console.log('\n--- Recent Events ---');
        diagnostics.events.slice(-10).forEach((event, i) => {
            console.log(`${i + 1}. [${event.type}] ${event.message}`);
        });
        
        // Make diagnostics available globally
        window.diagnostics = diagnostics;
        
        console.log('\n=== DIAGNOSTIC COMPLETE ===');
        console.log('Full results available in window.diagnostics');
    }
    
    // Run all tests
    function runDiagnostics() {
        console.log('Running diagnostics...');
        
        testLocalStorage();
        testDOMElements();
        testModules();
        
        // If DOM elements exist, try task creation
        if (diagnostics.domElements['task-form'] && diagnostics.domElements['task-form'].exists) {
            console.log('Attempting task creation test...');
            testTaskCreation();
        } else {
            console.log('Skipping task creation test - form not found');
            finalReport();
        }
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runDiagnostics);
    } else {
        runDiagnostics();
    }
    
})();