const fs = require('fs');
const path = require('path');

const testWorkspace = path.join(process.cwd(), 'test-workspace');

if (!fs.existsSync(testWorkspace)) {
  fs.mkdirSync(testWorkspace, { recursive: true });

  const readmeContent = `# Test Workspace

This is a test workspace for debugging the reswob-http-client extension.

The extension will create a \`.reswob-requests\` folder here to store saved requests when testing the save functionality.

## Usage

When debugging the extension:
1. The extension will open with this test workspace
2. You can save HTTP requests and they'll be stored in \`.reswob-requests/requests.json\`
3. The tree view will show saved requests and collections
4. Test drag & drop, collections, and deletion functionality

## Example Request

Try saving a request with:
- Method: GET
- URL: https://jsonplaceholder.typicode.com/posts/1
- Headers: {"Content-Type": "application/json"}
`;

  fs.writeFileSync(path.join(testWorkspace, 'README.md'), readmeContent);
  console.log('Test workspace created successfully!');
} else {
  console.log('Test workspace already exists.');
}
