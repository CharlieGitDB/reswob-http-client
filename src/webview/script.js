const vscode = acquireVsCodeApi();

// CodeMirror editors
let headersEditor, bodyEditor;

// Vim mode state
let vimMode = false;
let vimInsertMode = false;
let currentFocusIndex = 0;
let currentSection = 'form'; // 'form' or 'saved'
let savedRequestIndex = 0;
const focusableElements = ['method', 'url', 'headers', 'body'];

// Initialize CodeMirror editors
function initializeCodeMirror() {
  // Headers editor (JSON)
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
function validateJSON(editor) {
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

// Load saved requests on startup
window.addEventListener('load', () => {
  initializeCodeMirror();
  initializeVimMode();
});

function initializeVimMode() {
  const vimToggle = document.getElementById('vimModeToggle');
  const vimHelp = document.getElementById('vimHelp');
  const toggleLabel = document.querySelector('.toggle-label');

  // Toggle vim mode
  vimToggle.addEventListener('change', (e) => {
    vimMode = e.target.checked;
    updateVimModeIndicator();

    // Update toggle label color
    if (vimMode) {
      toggleLabel.classList.add('vim-enabled');
      focusElement(0);
      document.body.classList.add('vim-mode-normal');
    } else {
      toggleLabel.classList.remove('vim-enabled');
      document.body.classList.remove('vim-mode-normal', 'vim-mode-insert');
    }
  });

  // Global keydown handler for vim mode
  document.addEventListener('keydown', handleVimKeydown);
}

function updateVimModeIndicator() {
  if (vimMode) {
    if (vimInsertMode) {
      document.body.classList.remove('vim-mode-normal');
      document.body.classList.add('vim-mode-insert');
    } else {
      document.body.classList.remove('vim-mode-insert');
      document.body.classList.add('vim-mode-normal');
    }
  } else {
    document.body.classList.remove('vim-mode-normal', 'vim-mode-insert');
  }
}

function handleVimKeydown(e) {
  if (!vimMode) {
    return;
  }

  // Always handle help toggle
  if (e.key === '?' && !vimInsertMode) {
    e.preventDefault();
    toggleVimHelp();
    return;
  }

  // Handle escape to exit insert mode
  if (e.key === 'Escape') {
    e.preventDefault();
    if (vimInsertMode) {
      vimInsertMode = false;
      updateVimModeIndicator();
      document.activeElement.blur();
      focusElement(currentFocusIndex);
    }
    return;
  }

  // In insert mode, only handle escape
  if (vimInsertMode) {
    return;
  }

  // Normal mode commands
  switch (e.key) {
    case 'j':
      e.preventDefault();
      moveDown();
      break;
    case 'k':
      e.preventDefault();
      moveUp();
      break;
    case 'h':
      e.preventDefault();
      // Navigation only within form now
      break;
    case 'l':
      e.preventDefault();
      // Navigation only within form now
      break;
    case 'i':
      e.preventDefault();
      enterInsertMode();
      break;
    case 'Tab':
      e.preventDefault();
      if (e.shiftKey) {
        moveUp();
      } else {
        moveDown();
      }
      break;
    case 'Enter':
      e.preventDefault();
      if (currentSection === 'saved') {
        loadSelectedSavedRequest();
      } else if (document.activeElement.tagName === 'BUTTON') {
        document.activeElement.click();
      } else {
        enterInsertMode();
      }
      break;
    case 's':
      e.preventDefault();
      saveRequest();
      break;
    case 'r':
      e.preventDefault();
      // No saved requests to refresh
      break;
    case 'd':
      e.preventDefault();
      // No saved requests to delete
      break;
  }
}

function moveDown() {
  if (currentSection === 'form') {
    currentFocusIndex = Math.min(currentFocusIndex + 1, focusableElements.length - 1);
    focusElement(currentFocusIndex);
  }
}

function moveUp() {
  if (currentSection === 'form') {
    currentFocusIndex = Math.max(currentFocusIndex - 1, 0);
    focusElement(currentFocusIndex);
  }
}

function switchToFormSection() {
  currentSection = 'form';
  focusElement(currentFocusIndex);
}

function clearFormFocus() {
  document.querySelectorAll('.vim-mode-active').forEach((el) => {
    el.classList.remove('vim-mode-active');
  });
}

// Commented out saved request functions - no longer needed
/* 
function switchToSavedSection() {
  currentSection = 'saved';
  clearFormFocus();
  focusSavedRequest(savedRequestIndex);
}

function clearSavedRequestFocus() {
  document.querySelectorAll('.saved-request-item').forEach((el) => {
    el.classList.remove('vim-mode-active');
  });
}

function focusSavedRequest(index) {
  const savedItems = document.querySelectorAll('.saved-request-item');
  if (savedItems.length === 0) {
    return;
  }

  clearSavedRequestFocus();
  clearFormFocus();

  if (savedItems[index]) {
    savedItems[index].classList.add('vim-mode-active');
    savedItems[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function loadSelectedSavedRequest() {
  const savedItems = document.querySelectorAll('.saved-request-item');
  if (savedItems[savedRequestIndex]) {
    const requestName = savedItems[savedRequestIndex]
      .querySelector('.saved-request-method')
      .textContent.split(' ')
      .slice(1)
      .join(' ');
    loadRequestFromList(requestName);
    switchToFormSection(); // Switch back to form after loading
  }
}

function deleteSelectedSavedRequest() {
  const savedItems = document.querySelectorAll('.saved-request-item');
  if (savedItems[savedRequestIndex]) {
    const requestName = savedItems[savedRequestIndex]
      .querySelector('.saved-request-method')
      .textContent.split(' ')
      .slice(1)
      .join(' ');
    deleteRequest(requestName);
  }
}
*/

function focusElement(index) {
  // Remove previous focus indicators
  document.querySelectorAll('.vim-mode-active').forEach((el) => {
    el.classList.remove('vim-mode-active');
  });

  const elementId = focusableElements[index];
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.add('vim-mode-active');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Handle CodeMirror editors
    if (elementId === 'headers' && headersEditor) {
      headersEditor.getWrapperElement().classList.add('vim-mode-active');
      if (vimInsertMode) {
        headersEditor.focus();
      }
    } else if (elementId === 'body' && bodyEditor) {
      bodyEditor.getWrapperElement().classList.add('vim-mode-active');
      if (vimInsertMode) {
        bodyEditor.focus();
      }
    } else {
      // For buttons, also focus them
      if (element.tagName === 'BUTTON') {
        element.focus();
      }
    }
  }
}

function enterInsertMode() {
  const elementId = focusableElements[currentFocusIndex];
  const element = document.getElementById(elementId);

  if (elementId === 'headers' && headersEditor) {
    vimInsertMode = true;
    updateVimModeIndicator();
    headersEditor.focus();
    headersEditor.getWrapperElement().classList.remove('vim-mode-active');
  } else if (elementId === 'body' && bodyEditor) {
    vimInsertMode = true;
    updateVimModeIndicator();
    bodyEditor.focus();
    bodyEditor.getWrapperElement().classList.remove('vim-mode-active');
  } else if (
    element &&
    (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')
  ) {
    vimInsertMode = true;
    updateVimModeIndicator();
    element.focus();
    element.classList.remove('vim-mode-active');
  }
}

function toggleVimHelp() {
  const vimHelp = document.getElementById('vimHelp');
  vimHelp.style.display = vimHelp.style.display === 'none' ? 'block' : 'none';
}

function sendRequest() {
  const method = document.getElementById('method').value;
  const url = document.getElementById('url').value;
  const headers = headersEditor.getValue();
  const body = bodyEditor.getValue();

  if (!url.trim()) {
    alert('Please enter a URL');
    return;
  }

  try {
    const data = {
      method,
      url,
      headers: headers ? JSON.parse(headers) : {},
      body: body || undefined,
    };

    vscode.postMessage({
      type: 'sendRequest',
      data: data,
    });
  } catch (error) {
    alert('Invalid JSON in headers: ' + error.message);
  }
}

function saveRequest() {
  const method = document.getElementById('method').value;
  const url = document.getElementById('url').value;
  const headers = headersEditor.getValue();
  const body = bodyEditor.getValue();

  if (!url.trim()) {
    alert('Please enter a URL to save');
    return;
  }

  try {
    const data = {
      method,
      url,
      headers: headers ? JSON.parse(headers) : {},
      body: body || undefined,
    };

    vscode.postMessage({
      type: 'saveRequest',
      data: data,
    });
  } catch (error) {
    alert('Invalid JSON in headers: ' + error.message);
  }
}

function importRequests() {
  vscode.postMessage({
    type: 'importRequests',
  });
}

// Commented out - saved requests are now managed in the tree view
/*
function loadSavedRequests() {
  vscode.postMessage({
    type: 'loadSavedRequests',
  });
}

function deleteRequest(name) {
  vscode.postMessage({
    type: 'deleteRequest',
    data: { name },
  });
}

function displaySavedRequests(requests) {
  const container = document.getElementById('savedRequestsList');

  if (requests.length === 0) {
    container.innerHTML = '<p>No saved requests found.</p>';
    return;
  }

  container.innerHTML = requests
    .map(
      (request) => `
        <div class="saved-request-item">
            <div class="saved-request-info" onclick="loadRequestFromList('${request.name}')">
                <div class="saved-request-method">${request.method} ${request.name}</div>
                <div class="saved-request-url">${request.url}</div>
            </div>
            <button class="delete-button" onclick="deleteRequest('${request.name}')">×</button>
        </div>
    `
    )
    .join('');
}

function loadRequestFromList(name) {
  vscode.postMessage({
    type: 'loadRequest',
    data: { name },
  });
}
*/

function loadRequest(request) {
  document.getElementById('method').value = request.method;
  document.getElementById('url').value = request.url;
  headersEditor.setValue(JSON.stringify(request.headers, null, 2));
  bodyEditor.setValue(request.body || '');
}

window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.type) {
    case 'response':
      displayResponse(message.data);
      break;
    case 'loadRequest':
      loadRequest(message.data);
      break;
    case 'requestSaved':
      // Request saved successfully - no need to refresh saved list
      break;
    case 'importSuccess':
      alert('Requests imported successfully!');
      break;
    case 'importError':
      alert('Failed to import requests: ' + message.error);
      break;
  }
});

function displayResponse(response) {
  const responseDiv = document.getElementById('response');

  // Clear any existing content
  responseDiv.innerHTML = '';
  responseDiv.style.display = 'block';

  // Determine content type and format response
  let responseContent = '';
  let contentMode = 'application/json'; // Default to JSON mode

  try {
    if (response.error) {
      // Handle error responses
      responseContent = JSON.stringify({ error: response.error }, null, 2);
    } else if (typeof response === 'string') {
      // Handle string responses - try to detect content type
      const trimmedResponse = response.trim();

      if (
        trimmedResponse.startsWith('<') &&
        (trimmedResponse.includes('<html') || trimmedResponse.includes('<!DOCTYPE'))
      ) {
        // HTML content
        responseContent = response;
        contentMode = 'text/html';
      } else if (trimmedResponse.startsWith('<') && trimmedResponse.endsWith('>')) {
        // XML content
        responseContent = response;
        contentMode = 'application/xml';
      } else if (trimmedResponse.includes('{') && trimmedResponse.includes('}')) {
        // Likely JSON, try to parse and format
        try {
          const parsedJson = JSON.parse(response);
          responseContent = JSON.stringify(parsedJson, null, 2);
        } catch {
          // Not valid JSON, display as plain text
          responseContent = response;
          contentMode = 'text/plain';
        }
      } else {
        // Plain text
        responseContent = response;
        contentMode = 'text/plain';
      }
    } else if (typeof response === 'object' && response !== null) {
      // Handle object responses (most common case)
      responseContent = JSON.stringify(response, null, 2);
    } else {
      // Handle other types
      responseContent = String(response);
      contentMode = 'text/plain';
    }
  } catch (error) {
    // Fallback for any unexpected errors
    responseContent = JSON.stringify(
      { error: 'Failed to parse response', details: String(response) },
      null,
      2
    );
  }

  // Create a CodeMirror instance for the response
  const responseEditor = CodeMirror(responseDiv, {
    mode: contentMode,
    theme: 'default',
    lineNumbers: true,
    lineWrapping: true,
    value: responseContent,
    readOnly: true,
    foldGutter: ['application/json', 'application/xml', 'text/html'].includes(contentMode),
    gutters: ['application/json', 'application/xml', 'text/html'].includes(contentMode)
      ? ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
      : ['CodeMirror-linenumbers'],
    autoCloseBrackets: false,
    matchBrackets: ['application/json', 'application/xml', 'text/html'].includes(contentMode),
    indentUnit: 2,
    tabSize: 2,
    scrollbarStyle: 'native',
    viewportMargin: Infinity,
  });

  // Make sure the editor refreshes properly and handles scrolling
  setTimeout(() => {
    responseEditor.refresh();
    responseEditor.setSize(null, 'auto');
  }, 100);
}
