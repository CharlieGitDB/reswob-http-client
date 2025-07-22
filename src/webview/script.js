const vscode = acquireVsCodeApi();

// CodeMirror editors
let headersEditor, bodyEditor;

// Headers mode state
let headersFormMode = false; // false = JSON mode, true = Form mode

// Vim mode state
let vimMode = false;
let vimInsertMode = false;
let currentFocusIndex = 0;
let currentSection = 'form'; // 'form' or 'saved'
let currentPane = 'form'; // 'form' or 'response'
let savedRequestIndex = 0;
const focusableElements = ['method', 'url', 'headers', 'body'];
const responseTabs = ['body', 'headers', 'info'];
let currentResponseTab = 0;

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

// Initialize headers toggle functionality
function initializeHeadersToggle() {
  const toggleBtn = document.getElementById('headersModeToggle');
  const jsonMode = document.getElementById('headers-json-mode');
  const formMode = document.getElementById('headers-form-mode');

  toggleBtn.addEventListener('click', () => {
    headersFormMode = !headersFormMode;
    updateHeadersMode();
  });

  // Initialize with a default header in form mode
  updateHeadersMode();
}

function updateHeadersMode() {
  const toggleBtn = document.getElementById('headersModeToggle');
  const jsonMode = document.getElementById('headers-json-mode');
  const formMode = document.getElementById('headers-form-mode');

  if (headersFormMode) {
    // Switch to form mode
    jsonMode.style.display = 'none';
    formMode.style.display = 'block';
    toggleBtn.innerHTML = '📝 Switch to JSON';

    // Convert JSON to form if headers exist
    syncJsonToForm();
  } else {
    // Switch to JSON mode
    jsonMode.style.display = 'block';
    formMode.style.display = 'none';
    toggleBtn.innerHTML = '📝 Switch to Form';

    // Convert form to JSON
    syncFormToJson();
  }
}

function syncJsonToForm() {
  const headersList = document.getElementById('headersList');
  headersList.innerHTML = '';

  try {
    const jsonValue = headersEditor.getValue().trim();
    if (jsonValue) {
      const headers = JSON.parse(jsonValue);
      Object.entries(headers).forEach(([key, value]) => {
        addHeaderRow(key, value);
      });
    }
  } catch (e) {
    // If JSON is invalid, show empty form
  }

  // Always ensure at least one empty row
  if (headersList.children.length === 0) {
    addHeaderRow('', '');
  }
}

function syncFormToJson() {
  const headers = {};
  const headerRows = document.querySelectorAll('.header-row');

  headerRows.forEach((row) => {
    const keyInput = row.querySelector('.header-key');
    const valueInput = row.querySelector('.header-value');
    const key = keyInput.value.trim();
    const value = valueInput.value.trim();

    if (key && value) {
      headers[key] = value;
    }
  });

  headersEditor.setValue(Object.keys(headers).length > 0 ? JSON.stringify(headers, null, 2) : '');
}

function addHeaderRow(key = '', value = '') {
  const headersList = document.getElementById('headersList');
  const row = document.createElement('div');
  row.className = 'header-row';

  row.innerHTML = `
    <input type="text" class="header-key" placeholder="Header name" value="${key}">
    <input type="text" class="header-value" placeholder="Header value" value="${value}">
    <button type="button" class="remove-header-btn" onclick="removeHeaderRow(this)">×</button>
  `;

  headersList.appendChild(row);

  // Add event listeners to sync back to JSON when form changes
  const keyInput = row.querySelector('.header-key');
  const valueInput = row.querySelector('.header-value');

  keyInput.addEventListener('input', () => {
    if (!headersFormMode) {
      syncFormToJson();
    }
  });
  valueInput.addEventListener('input', () => {
    if (!headersFormMode) {
      syncFormToJson();
    }
  });
}

function removeHeaderRow(btn) {
  btn.parentElement.remove();
  if (headersFormMode) {
    syncFormToJson();
  }
}

// Initialize add header button and other DOM elements
function initializeDOMElements() {
  const addBtn = document.getElementById('addHeaderBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => addHeaderRow());
  }
}

// Load saved requests on startup
function initializeResponseTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchResponseTab(tabName);
    });
  });
}

function switchResponseTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');

  // Refresh CodeMirror editors when switching to body tab
  if (tabName === 'body') {
    setTimeout(() => {
      const bodyContent = document.getElementById('response-body-content');
      const codeMirrorEditor = bodyContent.querySelector('.CodeMirror');
      if (codeMirrorEditor && codeMirrorEditor.CodeMirror) {
        codeMirrorEditor.CodeMirror.refresh();
        // Ensure proper size after tab switch
        codeMirrorEditor.CodeMirror.setSize(null, '100%');
        // Additional refresh for proper rendering
        setTimeout(() => {
          codeMirrorEditor.CodeMirror.refresh();
        }, 100);
      }
    }, 50);
  }
}

// Load saved requests on startup
window.addEventListener('load', () => {
  initializeCodeMirror();
  initializeHeadersToggle();
  initializeResponseTabs();
  initializeDOMElements();
  initializeVimMode();
});

function initializeVimMode() {
  const vimToggle = document.getElementById('vimModeToggle');
  const vimHelp = document.getElementById('vimHelp');
  const toggleLabel = document.querySelector('.toggle-label');

  // Create scroll indicator
  createScrollIndicator();

  // Toggle vim mode
  vimToggle.addEventListener('change', (e) => {
    vimMode = e.target.checked;
    updateVimModeIndicator();

    // Update toggle label color
    if (vimMode) {
      toggleLabel.classList.add('vim-enabled');
      currentPane = 'form';
      currentSection = 'form';
      focusElement(0);
      document.body.classList.add('vim-mode-normal');
    } else {
      toggleLabel.classList.remove('vim-enabled');
      clearFormFocus();
      clearResponsePaneFocus();
      document.body.classList.remove('vim-mode-normal', 'vim-mode-insert');
      updateResponseScrollIndicator();
    }
  });

  // Global keydown handler for vim mode and shortcuts
  document.addEventListener('keydown', handleVimKeydown);
  document.addEventListener('keydown', handleGlobalKeydown);
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

function handleGlobalKeydown(e) {
  // Ctrl/Cmd + Space to toggle vim mode
  if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
    e.preventDefault();
    const vimToggle = document.getElementById('vimModeToggle');
    vimToggle.checked = !vimToggle.checked;
    vimToggle.dispatchEvent(new Event('change'));
    return;
  }

  // Ctrl/Cmd + Enter to send request
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    sendRequest();
    return;
  }

  // Vim mode pane switching with Ctrl/Cmd + h/l
  if (vimMode && !vimInsertMode && (e.ctrlKey || e.metaKey)) {
    if (e.key === 'h') {
      e.preventDefault();
      if (currentPane === 'response') {
        switchToFormPane();
      }
      return;
    }
    if (e.key === 'l') {
      e.preventDefault();
      if (currentPane === 'form') {
        switchToResponsePane();
      }
      return;
    }
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

  // Handle escape to exit insert mode or scroll mode
  if (e.key === 'Escape') {
    e.preventDefault();
    if (vimInsertMode) {
      vimInsertMode = false;
      updateVimModeIndicator();
      document.activeElement.blur();
      focusElement(currentFocusIndex);
    } else if (currentPane === 'response') {
      // Exit content scrolling mode if in it
      const activeTabContent = document.querySelector(
        '.tab-panel.active .tab-panel-content.vim-mode-active'
      );
      if (activeTabContent) {
        activeTabContent.classList.remove('vim-mode-active');
        focusResponseTab(currentResponseTab);
        updateResponseScrollIndicator();
      } else {
        // Switch back to form pane
        switchToFormPane();
      }
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
      if (currentPane === 'form') {
        moveDown();
      } else if (currentPane === 'response') {
        const scrollable = getScrollableElement();
        if (scrollable) {
          scrollDown(scrollable);
        } else {
          moveResponseTabDown();
        }
      }
      break;
    case 'k':
      e.preventDefault();
      if (currentPane === 'form') {
        moveUp();
      } else if (currentPane === 'response') {
        const scrollable = getScrollableElement();
        if (scrollable) {
          scrollUp(scrollable);
        } else {
          moveResponseTabUp();
        }
      }
      break;
    case 'g':
      e.preventDefault();
      if (currentPane === 'response') {
        const scrollable = getScrollableElement();
        if (scrollable) {
          scrollToTop(scrollable);
        }
      }
      break;
    case 'G':
      e.preventDefault();
      if (currentPane === 'response') {
        const scrollable = getScrollableElement();
        if (scrollable) {
          scrollToBottom(scrollable);
        }
      }
      break;
    case 'u':
      e.preventDefault();
      if (currentPane === 'response') {
        const scrollable = getScrollableElement();
        if (scrollable) {
          scrollPageUp(scrollable);
        }
      }
      break;
    case 'd':
      e.preventDefault();
      if (currentPane === 'response') {
        const scrollable = getScrollableElement();
        if (scrollable) {
          scrollPageDown(scrollable);
        }
      } else if (currentPane === 'form') {
        // Keep existing delete functionality for form
      }
      break;
    case 'h':
      e.preventDefault();
      // Left navigation within current pane
      if (currentPane === 'response') {
        // In response pane, h could move to previous tab
        const scrollable = getScrollableElement();
        if (scrollable) {
          // If in scroll mode, treat as regular scroll left (if applicable)
          // For now, we'll use it for tab navigation
          moveResponseTabUp();
        } else {
          moveResponseTabUp();
        }
      } else if (currentPane === 'form') {
        // In form pane, h could move to previous element or do nothing
        // For now, let's make it move up like k
        moveUp();
      }
      break;
    case 'l':
      e.preventDefault();
      // Right navigation within current pane
      if (currentPane === 'response') {
        // In response pane, l could move to next tab
        const scrollable = getScrollableElement();
        if (scrollable) {
          // If in scroll mode, treat as regular scroll right (if applicable)
          // For now, we'll use it for tab navigation
          moveResponseTabDown();
        } else {
          moveResponseTabDown();
        }
      } else if (currentPane === 'form') {
        // In form pane, l could move to next element or do nothing
        // For now, let's make it move down like j
        moveDown();
      }
      break;
    case 'i':
      e.preventDefault();
      if (currentPane === 'form') {
        enterInsertMode();
      }
      break;
    case 'Tab':
      e.preventDefault();
      if (currentPane === 'form') {
        if (e.shiftKey) {
          moveUp();
        } else {
          moveDown();
        }
      } else if (currentPane === 'response') {
        // Tab into the content area for scrolling
        const activeTabContent = document.querySelector('.tab-panel.active .tab-panel-content');
        if (activeTabContent && !activeTabContent.classList.contains('vim-mode-active')) {
          clearResponsePaneFocus();
          activeTabContent.classList.add('vim-mode-active');
          activeTabContent.focus();
          // Update visual indicator
          updateResponseScrollIndicator();
        } else if (activeTabContent && activeTabContent.classList.contains('vim-mode-active')) {
          // Tab out of content area back to tabs
          activeTabContent.classList.remove('vim-mode-active');
          focusResponseTab(currentResponseTab);
          updateResponseScrollIndicator();
        }
      }
      break;
    case 'Enter':
      e.preventDefault();
      if (currentPane === 'response') {
        const activeTabContent = document.querySelector('.tab-panel.active .tab-panel-content');
        if (activeTabContent && activeTabContent.classList.contains('vim-mode-active')) {
          // Enter switches back to tab navigation
          activeTabContent.classList.remove('vim-mode-active');
          focusResponseTab(currentResponseTab);
          updateResponseScrollIndicator();
        } else {
          // Activate the currently focused tab
          switchResponseTab(responseTabs[currentResponseTab]);
        }
      } else if (document.activeElement.tagName === 'BUTTON') {
        document.activeElement.click();
      } else {
        enterInsertMode();
      }
      break;
    case 'n':
      e.preventDefault();
      if (currentPane === 'form') {
        clearForm();
      }
      break;
    case 's':
      e.preventDefault();
      if (currentPane === 'form') {
        saveRequest();
      }
      break;
    case 'r':
      e.preventDefault();
      if (currentPane === 'form') {
        // Refresh/send request
        sendRequest();
      }
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

function switchToFormPane() {
  currentPane = 'form';
  currentSection = 'form';
  clearResponsePaneFocus();
  focusElement(currentFocusIndex);
}

function switchToResponsePane() {
  const tabsContainer = document.getElementById('response-tabs-container');
  if (tabsContainer && tabsContainer.style.display !== 'none') {
    currentPane = 'response';
    clearFormFocus();

    // Sync currentResponseTab with the actually active tab
    const activeTabButton = document.querySelector('.tab-btn.active');
    if (activeTabButton) {
      const tabName = activeTabButton.getAttribute('data-tab');
      const tabIndex = responseTabs.indexOf(tabName);
      if (tabIndex >= 0) {
        currentResponseTab = tabIndex;
      }
    }

    focusResponseTab(currentResponseTab);
  }
}

function getScrollableElement() {
  const activeTabContent = document.querySelector('.tab-panel.active .tab-panel-content');
  if (!activeTabContent || !activeTabContent.classList.contains('vim-mode-active')) {
    return null;
  }

  // Check if we're in the body tab with CodeMirror
  const bodyTab = document.getElementById('tab-body');
  if (bodyTab && bodyTab.classList.contains('active')) {
    const codeMirrorElement = bodyTab.querySelector('.CodeMirror');
    if (codeMirrorElement && codeMirrorElement.CodeMirror) {
      return {
        type: 'codemirror',
        element: codeMirrorElement,
        editor: codeMirrorElement.CodeMirror,
      };
    }
  }

  return {
    type: 'regular',
    element: activeTabContent,
  };
}

function scrollDown(scrollable, amount = 50) {
  if (scrollable.type === 'codemirror') {
    const scrollInfo = scrollable.editor.getScrollInfo();
    scrollable.editor.scrollTo(null, scrollInfo.top + amount);
  } else {
    scrollable.element.scrollTop += amount;
  }
}

function scrollUp(scrollable, amount = 50) {
  if (scrollable.type === 'codemirror') {
    const scrollInfo = scrollable.editor.getScrollInfo();
    scrollable.editor.scrollTo(null, scrollInfo.top - amount);
  } else {
    scrollable.element.scrollTop -= amount;
  }
}

function scrollToTop(scrollable) {
  if (scrollable.type === 'codemirror') {
    scrollable.editor.scrollTo(null, 0);
  } else {
    scrollable.element.scrollTop = 0;
  }
}

function scrollToBottom(scrollable) {
  if (scrollable.type === 'codemirror') {
    const scrollInfo = scrollable.editor.getScrollInfo();
    scrollable.editor.scrollTo(null, scrollInfo.height);
  } else {
    scrollable.element.scrollTop = scrollable.element.scrollHeight;
  }
}

function scrollPageUp(scrollable) {
  if (scrollable.type === 'codemirror') {
    const scrollInfo = scrollable.editor.getScrollInfo();
    const halfScreen = scrollInfo.clientHeight / 2;
    scrollable.editor.scrollTo(null, scrollInfo.top - halfScreen);
  } else {
    scrollable.element.scrollTop -= scrollable.element.clientHeight / 2;
  }
}

function scrollPageDown(scrollable) {
  if (scrollable.type === 'codemirror') {
    const scrollInfo = scrollable.editor.getScrollInfo();
    const halfScreen = scrollInfo.clientHeight / 2;
    scrollable.editor.scrollTo(null, scrollInfo.top + halfScreen);
  } else {
    scrollable.element.scrollTop += scrollable.element.clientHeight / 2;
  }
}

function moveResponseTabDown() {
  const newIndex = Math.min(currentResponseTab + 1, responseTabs.length - 1);
  if (newIndex !== currentResponseTab) {
    currentResponseTab = newIndex;
    switchResponseTab(responseTabs[currentResponseTab]);
    focusResponseTab(currentResponseTab);
  }
}

function moveResponseTabUp() {
  const newIndex = Math.max(currentResponseTab - 1, 0);
  if (newIndex !== currentResponseTab) {
    currentResponseTab = newIndex;
    switchResponseTab(responseTabs[currentResponseTab]);
    focusResponseTab(currentResponseTab);
  }
}

function focusResponseTab(index) {
  clearResponsePaneFocus();

  const tabButtons = document.querySelectorAll('.tab-btn');
  if (tabButtons[index]) {
    // Add vim mode highlighting to the correct tab
    tabButtons[index].classList.add('vim-mode-active');
    tabButtons[index].scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Also prepare the tab content for potential scrolling
    const activeTabPanel = document.querySelector('.tab-panel.active .tab-panel-content');
    if (activeTabPanel) {
      // Don't automatically add vim-mode-active to content, only when user tabs into it
      activeTabPanel.setAttribute('tabindex', '0');
    }
  }
  updateResponseScrollIndicator();
}

function updateResponseScrollIndicator() {
  const activeTabContent = document.querySelector('.tab-panel.active .tab-panel-content');
  const indicator = document.getElementById('vim-scroll-indicator') || createScrollIndicator();

  if (activeTabContent && activeTabContent.classList.contains('vim-mode-active')) {
    indicator.style.display = 'block';

    // Check if we're in the body tab with CodeMirror
    const bodyTab = document.getElementById('tab-body');
    if (bodyTab && bodyTab.classList.contains('active')) {
      const codeMirrorElement = bodyTab.querySelector('.CodeMirror');
      if (codeMirrorElement && codeMirrorElement.CodeMirror) {
        // Add visual indicator to CodeMirror
        codeMirrorElement.classList.add('vim-scroll-active');
        indicator.textContent =
          '📜 CodeMirror Scroll: j/k (↑↓), u/d (page), g/G (top/bottom), Tab/Enter (exit)';
      } else {
        indicator.textContent =
          '📜 Scroll Mode: j/k (↑↓), u/d (page), g/G (top/bottom), Tab/Enter (exit)';
      }
    } else {
      indicator.textContent =
        '📜 Scroll Mode: j/k (↑↓), u/d (page), g/G (top/bottom), Tab/Enter (exit)';
    }
  } else if (currentPane === 'response') {
    // Show tab navigation help when in response pane but not in scroll mode
    const tabNames = responseTabs
      .map((tab, index) => (index === currentResponseTab ? `[${tab.toUpperCase()}]` : tab))
      .join(' → ');
    indicator.style.display = 'block';
    indicator.textContent = `🔄 Tab Nav: j/k (${tabNames}), Tab/Enter (scroll mode), h (←form)`;
  } else {
    indicator.style.display = 'none';
    // Remove CodeMirror visual indicators
    document.querySelectorAll('.CodeMirror.vim-scroll-active').forEach((el) => {
      el.classList.remove('vim-scroll-active');
    });
  }
}

function createScrollIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'vim-scroll-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    display: none;
    max-width: 400px;
  `;
  document.body.appendChild(indicator);
  return indicator;
}

function clearResponsePaneFocus() {
  document.querySelectorAll('.tab-btn.vim-mode-active').forEach((el) => {
    el.classList.remove('vim-mode-active');
  });
  document.querySelectorAll('.tab-panel-content.vim-mode-active').forEach((el) => {
    el.classList.remove('vim-mode-active');
  });
  updateResponseScrollIndicator();
}

function clearForm() {
  document.getElementById('method').value = 'GET';
  document.getElementById('url').value = '';
  headersEditor.setValue('');
  bodyEditor.setValue('');

  // Clear form mode headers if in form mode
  if (headersFormMode) {
    const headersList = document.getElementById('headersList');
    headersList.innerHTML = '';
    addHeaderRow('', '');
  }

  // Focus back to first element
  currentFocusIndex = 0;
  focusElement(currentFocusIndex);
}

function clearFormFocus() {
  document.querySelectorAll('.vim-mode-active').forEach((el) => {
    el.classList.remove('vim-mode-active');
  });

  // Also clear CodeMirror vim-mode-active classes
  if (headersEditor) {
    headersEditor.getWrapperElement().classList.remove('vim-mode-active');
  }
  if (bodyEditor) {
    bodyEditor.getWrapperElement().classList.remove('vim-mode-active');
  }
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
  const sendButton = document.getElementById('sendButton');
  let headers = {};
  const body = bodyEditor.getValue();

  if (!url.trim()) {
    alert('Please enter a URL');
    return;
  }

  // Show loading state
  sendButton.classList.add('send-button-loading');
  sendButton.disabled = true;
  sendButton.textContent = '⏳ Sending...';

  try {
    // Get headers based on current mode
    if (headersFormMode) {
      // Form mode - collect from form inputs
      const headerRows = document.querySelectorAll('.header-row');
      headerRows.forEach((row) => {
        const keyInput = row.querySelector('.header-key');
        const valueInput = row.querySelector('.header-value');
        const key = keyInput.value.trim();
        const value = valueInput.value.trim();

        if (key && value) {
          headers[key] = value;
        }
      });
    } else {
      // JSON mode - parse from editor
      const headersValue = headersEditor.getValue();
      headers = headersValue ? JSON.parse(headersValue) : {};
    }

    const data = {
      method,
      url,
      headers: headers,
      body: body || undefined,
    };

    vscode.postMessage({
      type: 'sendRequest',
      data: data,
    });
  } catch (error) {
    // Reset button state on error
    resetSendButton();
    alert('Invalid JSON in headers: ' + error.message);
  }
}

function resetSendButton() {
  const sendButton = document.getElementById('sendButton');
  sendButton.classList.remove('send-button-loading');
  sendButton.disabled = false;
  sendButton.textContent = '🚀 Send Request';
}

function saveRequest() {
  const method = document.getElementById('method').value;
  const url = document.getElementById('url').value;
  let headers = {};
  const body = bodyEditor.getValue();

  if (!url.trim()) {
    alert('Please enter a URL to save');
    return;
  }

  try {
    // Get headers based on current mode
    if (headersFormMode) {
      // Form mode - collect from form inputs
      const headerRows = document.querySelectorAll('.header-row');
      headerRows.forEach((row) => {
        const keyInput = row.querySelector('.header-key');
        const valueInput = row.querySelector('.header-value');
        const key = keyInput.value.trim();
        const value = valueInput.value.trim();

        if (key && value) {
          headers[key] = value;
        }
      });
    } else {
      // JSON mode - parse from editor
      const headersValue = headersEditor.getValue();
      headers = headersValue ? JSON.parse(headersValue) : {};
    }

    const data = {
      method,
      url,
      headers: headers,
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

  // Set headers in JSON mode first, then update form if in form mode
  headersEditor.setValue(JSON.stringify(request.headers, null, 2));
  if (headersFormMode) {
    syncJsonToForm();
  }

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
  // Reset send button state
  resetSendButton();

  // Hide old response div and show new tabbed interface
  const oldResponseDiv = document.getElementById('response');
  const statusInfo = document.getElementById('response-status-info');
  const tabsContainer = document.getElementById('response-tabs-container');

  oldResponseDiv.style.display = 'none';
  statusInfo.style.display = 'block';
  tabsContainer.style.display = 'flex';

  // Update status and size info
  updateResponseStatus(response);

  // Update all tab content
  updateResponseBody(response);
  updateResponseHeaders(response);
  updateResponseInfo(response);

  // Switch to body tab by default
  switchResponseTab('body');
}

function updateResponseStatus(response) {
  const statusElement = document.getElementById('responseStatus');
  const sizeElement = document.getElementById('responseSize');

  if (response.error) {
    statusElement.textContent = 'Error';
    statusElement.className = 'status-badge error';
    sizeElement.textContent = '';
  } else {
    const status = response.status || 0;
    statusElement.textContent = `${status} ${response.statusText || ''}`;

    // Set status class based on status code
    if (status >= 200 && status < 300) {
      statusElement.className = 'status-badge success';
    } else if (status >= 300 && status < 400) {
      statusElement.className = 'status-badge info';
    } else if (status >= 400 && status < 500) {
      statusElement.className = 'status-badge warning';
    } else if (status >= 500) {
      statusElement.className = 'status-badge error';
    } else {
      statusElement.className = 'status-badge';
    }

    // Format size
    const size = response.size || 0;
    let sizeText = '';
    if (size < 1024) {
      sizeText = `${size} B`;
    } else if (size < 1024 * 1024) {
      sizeText = `${(size / 1024).toFixed(1)} KB`;
    } else {
      sizeText = `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    const responseTime = response.responseTime || 0;
    sizeElement.textContent = `${sizeText} • ${responseTime}ms`;
  }
}

function updateResponseBody(response) {
  const bodyContainer = document.getElementById('response-body-content');
  bodyContainer.innerHTML = '';

  // Determine content type and format response
  let responseContent = '';
  let contentMode = 'application/json';

  try {
    if (response.error) {
      responseContent = JSON.stringify({ error: response.error }, null, 2);
    } else if (response.body !== undefined) {
      if (typeof response.body === 'string') {
        const trimmedResponse = response.body.trim();

        if (
          trimmedResponse.startsWith('<') &&
          (trimmedResponse.includes('<html') || trimmedResponse.includes('<!DOCTYPE'))
        ) {
          responseContent = response.body;
          contentMode = 'text/html';
        } else if (trimmedResponse.startsWith('<') && trimmedResponse.endsWith('>')) {
          responseContent = response.body;
          contentMode = 'application/xml';
        } else if (trimmedResponse.includes('{') && trimmedResponse.includes('}')) {
          try {
            const parsedJson = JSON.parse(response.body);
            responseContent = JSON.stringify(parsedJson, null, 2);
          } catch {
            responseContent = response.body;
            contentMode = 'text/plain';
          }
        } else {
          responseContent = response.body;
          contentMode = 'text/plain';
        }
      } else {
        responseContent = JSON.stringify(response.body, null, 2);
      }
    } else {
      responseContent = 'No response body';
      contentMode = 'text/plain';
    }
  } catch (error) {
    responseContent = JSON.stringify(
      { error: 'Failed to parse response', details: String(response) },
      null,
      2
    );
  }

  // Create CodeMirror instance for response body
  const responseEditor = CodeMirror(bodyContainer, {
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
    viewportMargin: Infinity, // Allow proper rendering of large content
  });

  setTimeout(() => {
    responseEditor.refresh();
    // Set height to fill the container properly
    responseEditor.setSize(null, '100%');
    // Force refresh to ensure proper sizing
    responseEditor.refresh();

    // Additional refresh after a brief delay to ensure proper layout
    setTimeout(() => {
      responseEditor.refresh();
    }, 50);
  }, 100);
}

function updateResponseHeaders(response) {
  const headersContainer = document.getElementById('response-headers-table');
  headersContainer.innerHTML = '';

  if (response.headers && Object.keys(response.headers).length > 0) {
    const table = document.createElement('table');
    table.className = 'headers-table';

    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Header</th>
        <th>Value</th>
      </tr>
    `;
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');
    Object.entries(response.headers).forEach(([key, value]) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${key}</td>
        <td>${Array.isArray(value) ? value.join(', ') : value}</td>
      `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    headersContainer.appendChild(table);
  } else {
    headersContainer.innerHTML = '<p>No response headers</p>';
  }
}

function updateResponseInfo(response) {
  const infoContainer = document.getElementById('response-info-content');
  infoContainer.innerHTML = '';

  const generalSection = document.createElement('div');
  generalSection.className = 'info-section';
  generalSection.innerHTML = `
    <h4>General</h4>
    <div class="info-item">
      <span class="info-label">Status:</span>
      <span class="info-value">${response.status || 'N/A'} ${response.statusText || ''}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Response Time:</span>
      <span class="info-value">${response.responseTime || 0}ms</span>
    </div>
    <div class="info-item">
      <span class="info-label">Size:</span>
      <span class="info-value">${response.size || 0} bytes</span>
    </div>
  `;

  if (response.error) {
    const errorSection = document.createElement('div');
    errorSection.className = 'info-section';
    errorSection.innerHTML = `
      <h4>Error</h4>
      <div class="info-item">
        <span class="info-label">Message:</span>
        <span class="info-value">${response.error}</span>
      </div>
    `;
    infoContainer.appendChild(errorSection);
  }

  infoContainer.appendChild(generalSection);

  // Add timing information if available
  if (response.responseTime) {
    const timingSection = document.createElement('div');
    timingSection.className = 'info-section';
    timingSection.innerHTML = `
      <h4>Timing</h4>
      <div class="info-item">
        <span class="info-label">Total Time:</span>
        <span class="info-value">${response.responseTime}ms</span>
      </div>
    `;
    infoContainer.appendChild(timingSection);
  }
}
