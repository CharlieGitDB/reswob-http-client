// Quick test script to verify Postman conversion functions
const fs = require('fs');

// Mock VS Code functions that our extension uses
const mockVscode = {
  workspace: {
    getConfiguration: () => ({
      get: () => undefined,
    }),
    workspaceFolders: [
      {
        uri: { fsPath: 'c:\\Users\\c\\projects\\reswob-http-client\\test-workspace' },
      },
    ],
  },
  window: {
    showErrorMessage: (msg) => console.log('ERROR:', msg),
    showInformationMessage: (msg) => console.log('INFO:', msg),
    showOpenDialog: () => Promise.resolve([{ fsPath: 'test.json' }]),
    showSaveDialog: () => Promise.resolve({ fsPath: 'test.json' }),
  },
  Uri: {
    file: (path) => ({ fsPath: path }),
  },
};

// Load the compiled extension code
const path = require('path');
const extensionPath = path.join(__dirname, 'out', 'extension.js');

if (!fs.existsSync(extensionPath)) {
  console.log('Extension not compiled yet. Please run: npm run compile');
  process.exit(1);
}

// We need to compile first to test the functions
console.log('Please run "npm run compile" first to generate the compiled extension code.');
console.log('Then we can test the Postman conversion functions.');
