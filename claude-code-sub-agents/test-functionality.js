// Test script to check todo app functionality
(function() {
    console.log('=== TODO APP FUNCTIONALITY TEST ===');
    
    // Wait for app to load
    const waitForApp = () => {
        return new Promise((resolve) => {
            if (window.TodoApp && window.TodoApp.isReady()) {
                resolve();
            } else {
                setTimeout(() => waitForApp().then(resolve), 100);
            }
        });
    };

    const testResults = {
        appLoaded: false,
        localStorageAvailable: false,
        tasksInStorage: [],
        formExists: false,
        canAddTask: false,
        taskCountUpdates: false,
        searchExists: false,
        filterExists: false,
        errors: []
    };

    // Test localStorage
    function testLocalStorage() {
        try {
            const testKey = 'test_storage';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            testResults.localStorageAvailable = true;
            console.log('✓ localStorage is available');
            
            // Check current tasks in storage
            const tasksData = localStorage.getItem('todoapp_tasks');
            if (tasksData) {
                try {
                    const parsed = JSON.parse(tasksData);
                    testResults.tasksInStorage = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
                    console.log('✓ Found tasks in storage:', testResults.tasksInStorage.length);
                } catch (e) {
                    console.warn('⚠ Invalid tasks data in storage');
                    testResults.errors.push('Invalid tasks data format in localStorage');
                }
            } else {
                console.log('ℹ No tasks found in storage');
            }
        } catch (e) {
            testResults.localStorageAvailable = false;
            console.log('✗ localStorage not available:', e.message);
            testResults.errors.push('localStorage not available: ' + e.message);
        }
    }

    // Test form elements
    function testFormElements() {
        const taskForm = document.getElementById('task-form');
        const taskInput = document.getElementById('task-input');
        const submitButton = document.querySelector('.task-form__submit');
        
        if (taskForm && taskInput && submitButton) {
            testResults.formExists = true;
            console.log('✓ Task form elements found');
            return { taskForm, taskInput, submitButton };
        } else {
            testResults.formExists = false;
            console.log('✗ Task form elements missing');
            testResults.errors.push('Task form elements not found');
            return null;
        }
    }

    // Test task creation
    async function testTaskCreation() {
        const elements = testFormElements();
        if (!elements) return false;

        try {
            const { taskInput, taskForm } = elements;
            const testTaskTitle = 'Test Task ' + Date.now();
            
            // Clear input and add test task
            taskInput.value = testTaskTitle;
            taskInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Submit the form
            taskForm.dispatchEvent(new Event('submit', { bubbles: true }));
            
            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if task was added to DOM
            const taskList = document.getElementById('task-list');
            const taskItems = taskList ? taskList.querySelectorAll('.task-item') : [];
            
            if (taskItems.length > 0) {
                testResults.canAddTask = true;
                console.log('✓ Task creation appears to work - tasks in DOM:', taskItems.length);
                
                // Check if task count updated
                const taskCountElement = document.querySelector('[data-count="total"]');
                if (taskCountElement && parseInt(taskCountElement.textContent) > 0) {
                    testResults.taskCountUpdates = true;
                    console.log('✓ Task count updates correctly');
                } else {
                    console.log('⚠ Task count may not be updating');
                }
            } else {
                testResults.canAddTask = false;
                console.log('✗ Task creation failed - no tasks in DOM');
                testResults.errors.push('Task creation failed - no tasks appeared in DOM');
            }
        } catch (e) {
            testResults.canAddTask = false;
            console.log('✗ Error testing task creation:', e.message);
            testResults.errors.push('Task creation error: ' + e.message);
        }
    }

    // Test search functionality
    function testSearchFilter() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            testResults.searchExists = true;
            console.log('✓ Search input found');
        } else {
            testResults.searchExists = false;
            console.log('✗ Search input not found');
            testResults.errors.push('Search input not found');
        }
    }

    // Test filter functionality
    function testFilters() {
        const filterButtons = document.querySelectorAll('[data-filter]');
        if (filterButtons.length > 0) {
            testResults.filterExists = true;
            console.log('✓ Filter buttons found:', filterButtons.length);
        } else {
            testResults.filterExists = false;
            console.log('✗ Filter buttons not found');
            testResults.errors.push('Filter buttons not found');
        }
    }

    // Check for JavaScript errors
    function checkForErrors() {
        window.addEventListener('error', (e) => {
            console.log('✗ JavaScript Error:', e.error);
            testResults.errors.push('JavaScript Error: ' + e.error.message);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.log('✗ Unhandled Promise Rejection:', e.reason);
            testResults.errors.push('Promise Rejection: ' + e.reason);
        });
    }

    // Main test function
    async function runTests() {
        console.log('Starting functionality tests...');
        checkForErrors();
        
        try {
            await waitForApp();
            testResults.appLoaded = true;
            console.log('✓ App loaded successfully');
        } catch (e) {
            testResults.appLoaded = false;
            console.log('✗ App failed to load:', e.message);
            testResults.errors.push('App load error: ' + e.message);
        }

        testLocalStorage();
        testSearchFilter();
        testFilters();
        await testTaskCreation();

        // Final report
        console.log('\n=== TEST RESULTS SUMMARY ===');
        console.log('App Loaded:', testResults.appLoaded ? '✓' : '✗');
        console.log('localStorage Available:', testResults.localStorageAvailable ? '✓' : '✗');
        console.log('Tasks in Storage:', testResults.tasksInStorage.length);
        console.log('Form Elements:', testResults.formExists ? '✓' : '✗');
        console.log('Can Add Tasks:', testResults.canAddTask ? '✓' : '✗');
        console.log('Task Count Updates:', testResults.taskCountUpdates ? '✓' : '✗');
        console.log('Search Available:', testResults.searchExists ? '✓' : '✗');
        console.log('Filters Available:', testResults.filterExists ? '✓' : '✗');
        
        if (testResults.errors.length > 0) {
            console.log('\n=== ERRORS FOUND ===');
            testResults.errors.forEach((error, i) => {
                console.log(`${i + 1}. ${error}`);
            });
        } else {
            console.log('\n✓ No errors detected');
        }

        // Store results globally for inspection
        window.testResults = testResults;
        
        return testResults;
    }

    // Run tests when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runTests);
    } else {
        runTests();
    }
})();