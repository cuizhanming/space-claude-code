#!/usr/bin/env node
// Simple headless browser test for the todo app
const { execSync } = require('child_process');

console.log('=== TODO APP BROWSER TEST ===\n');

try {
  // Test using Puppeteer if available, otherwise fallback to manual instructions
  const puppeteer = require('puppeteer');
  
  (async () => {
    console.log('Starting headless browser test...');
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Listen for console messages and errors
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    try {
      // Navigate to the test page
      console.log('Loading test page...');
      await page.goto('http://localhost:8080/test-comprehensive.html', { 
        waitUntil: 'networkidle0',
        timeout: 10000 
      });
      
      // Wait for the app to load
      await page.waitForTimeout(3000);
      
      // Check if test results are available
      const testResults = await page.evaluate(() => {
        return window.testResults || null;
      });
      
      // Get localStorage content
      const localStorageContent = await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('todoapp_')) {
            try {
              storage[key] = JSON.parse(localStorage.getItem(key));
            } catch (e) {
              storage[key] = localStorage.getItem(key);
            }
          }
        }
        return storage;
      });
      
      // Try to add a task
      console.log('Testing task creation...');
      const taskAdded = await page.evaluate(() => {
        const taskInput = document.getElementById('task-input');
        const taskForm = document.getElementById('task-form');
        
        if (!taskInput || !taskForm) {
          return { success: false, error: 'Form elements not found' };
        }
        
        try {
          taskInput.value = 'Test Task from Browser Automation';
          taskInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Submit the form
          taskForm.dispatchEvent(new Event('submit', { bubbles: true }));
          
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      // Wait for task to be processed
      await page.waitForTimeout(1000);
      
      // Check if task appears in the DOM
      const taskInDOM = await page.evaluate(() => {
        const taskList = document.getElementById('task-list');
        const taskItems = taskList ? taskList.querySelectorAll('.task-item') : [];
        const taskCount = document.querySelector('[data-count="total"]');
        
        return {
          taskListExists: !!taskList,
          taskItemCount: taskItems.length,
          displayedCount: taskCount ? taskCount.textContent : '0',
          taskTexts: Array.from(taskItems).map(item => {
            const textElement = item.querySelector('.task__text, .task-item__text, .task-title');
            return textElement ? textElement.textContent : 'No text found';
          })
        };
      });
      
      // Final localStorage check
      const finalLocalStorage = await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('todoapp_')) {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              storage[key] = data;
            } catch (e) {
              storage[key] = localStorage.getItem(key);
            }
          }
        }
        return storage;
      });
      
      // Generate report
      console.log('\n=== TEST RESULTS ===');
      
      if (testResults) {
        console.log('✓ Test script executed successfully');
        console.log(`App Loaded: ${testResults.appLoaded ? '✓' : '✗'}`);
        console.log(`localStorage Available: ${testResults.localStorageAvailable ? '✓' : '✗'}`);
        console.log(`Form Elements: ${testResults.formExists ? '✓' : '✗'}`);
        console.log(`Can Add Tasks: ${testResults.canAddTask ? '✓' : '✗'}`);
        console.log(`Search Available: ${testResults.searchExists ? '✓' : '✗'}`);
        console.log(`Filters Available: ${testResults.filterExists ? '✓' : '✗'}`);
        
        if (testResults.errors.length > 0) {
          console.log('\n=== ERRORS DETECTED ===');
          testResults.errors.forEach((error, i) => {
            console.log(`${i + 1}. ${error}`);
          });
        }
      } else {
        console.log('⚠ Test script did not execute or results not available');
      }
      
      console.log('\n=== TASK CREATION TEST ===');
      console.log(`Task Addition Attempted: ${taskAdded.success ? '✓' : '✗'}`);
      if (!taskAdded.success) {
        console.log(`Error: ${taskAdded.error}`);
      }
      
      console.log(`Task List Exists: ${taskInDOM.taskListExists ? '✓' : '✗'}`);
      console.log(`Tasks in DOM: ${taskInDOM.taskItemCount}`);
      console.log(`Displayed Count: ${taskInDOM.displayedCount}`);
      
      if (taskInDOM.taskTexts.length > 0) {
        console.log('Task Texts:', taskInDOM.taskTexts);
      }
      
      console.log('\n=== LOCALSTORAGE CONTENT ===');
      console.log('Initial Storage:', JSON.stringify(localStorageContent, null, 2));
      console.log('Final Storage:', JSON.stringify(finalLocalStorage, null, 2));
      
      if (errors.length > 0) {
        console.log('\n=== JAVASCRIPT ERRORS ===');
        errors.forEach((error, i) => {
          console.log(`${i + 1}. ${error}`);
        });
      }
      
      if (consoleMessages.length > 0) {
        console.log('\n=== CONSOLE MESSAGES (last 10) ===');
        consoleMessages.slice(-10).forEach((msg, i) => {
          console.log(`${i + 1}. ${msg}`);
        });
      }
      
    } catch (testError) {
      console.error('Test execution failed:', testError.message);
    }
    
    await browser.close();
    console.log('\nBrowser test completed.');
  })();
  
} catch (requireError) {
  console.log('Puppeteer not available. Manual testing instructions:');
  console.log('1. Open http://localhost:8080/test-comprehensive.html in your browser');
  console.log('2. Check the test panel on the right side of the page');
  console.log('3. Try adding a task using the form');
  console.log('4. Check browser console for errors');
  console.log('5. Inspect localStorage for saved tasks');
  console.log('\nAlternatively, install Puppeteer: npm install puppeteer');
}