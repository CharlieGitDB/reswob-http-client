// Development note: This file is now written in TypeScript!
// The webview script is compiled from TypeScript to JavaScript during the build process.
//
// TypeScript provides:
// - Better code completion and IntelliSense
// - Type checking for webview-specific APIs
// - Easier refactoring and maintenance
// - Better error detection during development
//
// The compiled JavaScript is what actually runs in the webview.

import type { CodeMirrorEditor, HttpRequest, HttpResponse, SavedRequest } from './types';

const vscode = acquireVsCodeApi();

// CodeMirror editors
let headersEditor: any; // Using any to avoid complex CodeMirror typing
let bodyEditor: any;

// Headers mode state
let headersFormMode: boolean = false; // false = JSON mode, true = Form mode

// Vim mode state
let vimMode: boolean = false;
let vimInsertMode: boolean = false;
let currentFocusIndex: number = 0;
let currentSection: 'form' | 'saved' = 'form';
let currentPane: 'form' | 'response' = 'form';
let savedRequestIndex: number = 0;
const focusableElements: string[] = ['method', 'url', 'headers', 'body'];
const responseTabs: string[] = ['body', 'headers', 'info'];
let currentResponseTab: number = 0;

// Initialize CodeMirror editors
function initializeCodeMirror(): void {
  // Headers editor (JSON)
  // @ts-ignore - CodeMirror is loaded globally
  headersEditor = CodeMirror(document.getElementById('headers'), {
    mode: 'application/json',
    theme: 'default',
    lineNumbers: true,
    lineWrapping: true,
    value: '{"Content-Type": "application/json"}',
    placeholder: '{"Content-Type": "application/json"}',
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
  });

  // Body editor (JSON)
  // @ts-ignore - CodeMirror is loaded globally
  bodyEditor = CodeMirror(document.getElementById('body'), {
    mode: 'application/json',
    theme: 'default',
    lineNumbers: true,
    lineWrapping: true,
    value: '{"key": "value"}',
    placeholder: '{"key": "value"}',
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
  });

  // Clear initial placeholder values
  headersEditor.setValue('');
  bodyEditor.setValue('');

  // Add validation feedback
  headersEditor.on('change', function () {
    validateJSON(headersEditor);
  });

  bodyEditor.on('change', function () {
    validateJSON(bodyEditor);
  });
}

// Validate JSON and provide visual feedback
function validateJSON(editor: any): void {
  const value = editor.getValue().trim();
  if (value === '') {
    return;
  }

  try {
    JSON.parse(value);
    // Valid JSON - remove error styling
    editor.getWrapperElement().classList.remove('json-error');
  } catch (e) {
    // Invalid JSON - add error styling
    editor.getWrapperElement().classList.add('json-error');
  }
}

// Make this available for development/testing
// @ts-ignore - Making functions available globally for webview
window.sendRequest = sendRequest;
window.saveRequest = saveRequest;
window.loadRequest = loadRequest;

// Simple type-safe helper functions for DOM manipulation
function getInputValue(id: string): string {
  const element = document.getElementById(id) as HTMLInputElement;
  return element ? element.value : '';
}

function setInputValue(id: string, value: string): void {
  const element = document.getElementById(id) as HTMLInputElement;
  if (element) {
    element.value = value;
  }
}

function getSelectValue(id: string): string {
  const element = document.getElementById(id) as HTMLSelectElement;
  return element ? element.value : '';
}

function setSelectValue(id: string, value: string): void {
  const element = document.getElementById(id) as HTMLSelectElement;
  if (element) {
    element.value = value;
  }
}

// Example of how the rest of the functions would be structured with TypeScript
function sendRequest(): void {
  const method = getSelectValue('method');
  const url = getInputValue('url');

  if (!url.trim()) {
    alert('Please enter a URL');
    return;
  }

  // Create typed request object
  const request: HttpRequest = {
    method,
    url,
    headers: {},
    body: bodyEditor.getValue(),
  };

  // Send message to extension
  vscode.postMessage({
    command: 'sendRequest',
    data: request,
  });
}

function saveRequest(): void {
  const method = getSelectValue('method');
  const url = getInputValue('url');

  if (!url.trim()) {
    alert('Please enter a URL to save');
    return;
  }

  // Create typed saved request object
  const savedRequest: SavedRequest = {
    id: Date.now().toString(),
    name: `${method} ${url}`,
    method,
    url,
    headers: {},
    body: bodyEditor.getValue(),
  };

  // Send message to extension
  vscode.postMessage({
    command: 'saveRequest',
    data: savedRequest,
  });
}

function loadRequest(request: SavedRequest): void {
  setSelectValue('method', request.method);
  setInputValue('url', request.url);

  if (request.headers) {
    headersEditor.setValue(JSON.stringify(request.headers, null, 2));
  }

  if (request.body) {
    bodyEditor.setValue(request.body);
  }
}

// Initialize when page loads
window.addEventListener('load', () => {
  initializeCodeMirror();
  // Additional initialization code would go here
});

// Handle messages from extension
window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data;

  switch (message.command) {
    case 'loadRequest':
      loadRequest(message.data);
      break;
    case 'response':
      displayResponse(message.data);
      break;
    default:
      console.log('Unknown message command:', message.command);
  }
});

function displayResponse(response: HttpResponse): void {
  // Response display logic would go here
  console.log('Response received:', response);
}

// Export types for use in other files if needed
export type { HttpRequest, HttpResponse, SavedRequest };
