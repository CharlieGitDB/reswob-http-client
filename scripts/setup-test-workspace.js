const fs = require('fs');
const path = require('path');

const testWorkspace = path.join(process.cwd(), 'test-workspace');

if (!fs.existsSync(testWorkspace)) {
  fs.mkdirSync(testWorkspace, { recursive: true });
  createTestWorkspaceFiles();
  console.log('Test workspace created successfully!');
} else {
  console.log('Test workspace already exists.');
}

function createTestWorkspaceFiles() {
  // Create .reswob-requests directory
  const reswobDir = path.join(testWorkspace, '.reswob-requests');
  fs.mkdirSync(reswobDir, { recursive: true });

  // Create README.md
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

  // Create .reswob-requests/requests.json
  const requestsData = {
    version: '1.0.0',
    requests: [
      {
        name: 'Quick API Request',
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        headers: {
          'Content-Type': 'application/json',
        },
        timestamp: new Date().toISOString(),
        collection: 'Performance Tests',
      },
      {
        name: 'Large Response Test',
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts',
        headers: {
          'Content-Type': 'application/json',
        },
        timestamp: new Date().toISOString(),
        collection: 'Performance Tests',
      },
      {
        name: 'POST Request Test',
        method: 'POST',
        url: 'https://jsonplaceholder.typicode.com/posts',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{\n  "title": "Performance Test",\n  "body": "Testing improved vim navigation in response body",\n  "userId": 1\n}',
        timestamp: new Date().toISOString(),
        collection: 'Performance Tests',
      },
      {
        name: 'XML Response Test',
        method: 'GET',
        url: 'https://httpbin.org/xml',
        headers: {
          Accept: 'application/xml',
        },
        timestamp: new Date().toISOString(),
        collection: 'Performance Tests',
      },
    ],
    collections: [
      {
        name: 'Performance Tests',
        requests: [
          'Quick API Request',
          'Large Response Test',
          'POST Request Test',
          'XML Response Test',
        ],
      },
    ],
  };

  fs.writeFileSync(path.join(reswobDir, 'requests.json'), JSON.stringify(requestsData, null, 2));

  // Create sample.postman_collection.json
  const postmanCollection = {
    info: {
      _postman_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Sample API Collection',
      description: 'A sample collection for testing Postman import/export functionality',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      {
        name: 'Users',
        item: [
          {
            name: 'Get All Users',
            request: {
              method: 'GET',
              header: [
                {
                  key: 'Authorization',
                  value: 'Bearer {{auth_token}}',
                  type: 'text',
                },
                {
                  key: 'Content-Type',
                  value: 'application/json',
                  type: 'text',
                },
              ],
              url: {
                raw: '{{base_url}}/api/v1/users',
                host: ['{{base_url}}'],
                path: ['api', 'v1', 'users'],
              },
            },
            response: [],
          },
          {
            name: 'Create User',
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Authorization',
                  value: 'Bearer {{auth_token}}',
                  type: 'text',
                },
                {
                  key: 'Content-Type',
                  value: 'application/json',
                  type: 'text',
                },
              ],
              body: {
                mode: 'raw',
                raw: '{\n  "name": "John Doe",\n  "email": "john.doe@example.com",\n  "role": "user"\n}',
                options: {
                  raw: {
                    language: 'json',
                  },
                },
              },
              url: {
                raw: '{{base_url}}/api/v1/users',
                host: ['{{base_url}}'],
                path: ['api', 'v1', 'users'],
              },
            },
            response: [],
          },
        ],
      },
      {
        name: 'Authentication',
        item: [
          {
            name: 'Login',
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                  type: 'text',
                },
              ],
              body: {
                mode: 'raw',
                raw: '{\n  "username": "admin@example.com",\n  "password": "password123"\n}',
                options: {
                  raw: {
                    language: 'json',
                  },
                },
              },
              url: {
                raw: '{{base_url}}/api/v1/auth/login',
                host: ['{{base_url}}'],
                path: ['api', 'v1', 'auth', 'login'],
              },
            },
            response: [],
          },
        ],
      },
      {
        name: 'Health Check',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: '{{base_url}}/health',
            host: ['{{base_url}}'],
            path: ['health'],
          },
        },
        response: [],
      },
    ],
    event: [
      {
        listen: 'prerequest',
        script: {
          exec: [''],
          type: 'text/javascript',
        },
      },
      {
        listen: 'test',
        script: {
          exec: [''],
          type: 'text/javascript',
        },
      },
    ],
    variable: [
      {
        key: 'base_url',
        value: 'https://api.example.com',
        type: 'string',
      },
      {
        key: 'auth_token',
        value: '',
        type: 'string',
      },
    ],
  };

  fs.writeFileSync(
    path.join(testWorkspace, 'sample.postman_collection.json'),
    JSON.stringify(postmanCollection, null, 2)
  );
}
