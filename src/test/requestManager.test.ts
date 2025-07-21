import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';

// We need to import and expose RequestManager for testing
// This would require modifying extension.ts to export the RequestManager class

interface HttpRequest {
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: string;
}

interface RequestCollection {
  version: string;
  requests: HttpRequest[];
}

// Mock RequestManager implementation for testing
class MockRequestManager {
  private static readonly REQUESTS_FOLDER = '.reswob-requests';
  private static readonly COLLECTION_FILE = 'requests.json';

  static async ensureRequestsFolder(): Promise<string> {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      throw new Error('No workspace folder found. Please open a folder to save requests.');
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const requestsDir = path.join(workspaceRoot, this.REQUESTS_FOLDER);

    if (!fs.existsSync(requestsDir)) {
      fs.mkdirSync(requestsDir, { recursive: true });
    }

    return requestsDir;
  }

  static async getCollectionPath(): Promise<string> {
    const requestsDir = await this.ensureRequestsFolder();
    return path.join(requestsDir, this.COLLECTION_FILE);
  }

  static async loadCollection(): Promise<RequestCollection> {
    try {
      const collectionPath = await this.getCollectionPath();
      if (fs.existsSync(collectionPath)) {
        const content = fs.readFileSync(collectionPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Error loading collection:', error);
    }

    return {
      version: '1.0.0',
      requests: [],
    };
  }

  static async saveCollection(collection: RequestCollection): Promise<void> {
    try {
      const collectionPath = await this.getCollectionPath();
      fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
    } catch (error) {
      console.error('Error saving collection:', error);
      throw error;
    }
  }

  static async saveRequest(request: HttpRequest): Promise<void> {
    const collection = await this.loadCollection();
    collection.requests = collection.requests.filter((r) => r.name !== request.name);
    collection.requests.push(request);
    await this.saveCollection(collection);
  }

  static async deleteRequest(name: string): Promise<void> {
    const collection = await this.loadCollection();
    collection.requests = collection.requests.filter((r) => r.name !== name);
    await this.saveCollection(collection);
  }

  static async getRequestNames(): Promise<string[]> {
    const collection = await this.loadCollection();
    return collection.requests.map((r) => r.name);
  }

  static async getRequest(name: string): Promise<HttpRequest | undefined> {
    const collection = await this.loadCollection();
    return collection.requests.find((r) => r.name === name);
  }

  static async exportToFile(exportPath: string): Promise<void> {
    const collection = await this.loadCollection();
    fs.writeFileSync(exportPath, JSON.stringify(collection, null, 2));
  }

  static async importFromFile(importPath: string): Promise<void> {
    const content = fs.readFileSync(importPath, 'utf-8');
    const importedCollection: RequestCollection = JSON.parse(content);

    const currentCollection = await this.loadCollection();
    const existingNames = new Set(currentCollection.requests.map((r) => r.name));
    const newRequests = importedCollection.requests.filter((r) => !existingNames.has(r.name));

    currentCollection.requests.push(...newRequests);
    await this.saveCollection(currentCollection);
  }
}

suite('RequestManager Test Suite', () => {
  let sandbox: sinon.SinonSandbox;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;
  let tempDir: string;

  setup(() => {
    sandbox = sinon.createSandbox();

    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(__dirname, 'test-requests-'));

    // Mock workspace folder
    mockWorkspaceFolder = {
      uri: vscode.Uri.file(tempDir),
      name: 'test-workspace',
      index: 0,
    };

    // Mock workspace folders
    sandbox.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
  });

  teardown(() => {
    sandbox.restore();
    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('ensureRequestsFolder creates folder if not exists', async () => {
    const requestsDir = await MockRequestManager.ensureRequestsFolder();

    assert.ok(fs.existsSync(requestsDir));
    assert.strictEqual(path.basename(requestsDir), '.reswob-requests');
  });

  test('ensureRequestsFolder throws error when no workspace folder', async () => {
    sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);

    await assert.rejects(MockRequestManager.ensureRequestsFolder(), /No workspace folder found/);
  });

  test('loadCollection returns default collection when file does not exist', async () => {
    const collection = await MockRequestManager.loadCollection();

    assert.strictEqual(collection.version, '1.0.0');
    assert.strictEqual(collection.requests.length, 0);
  });

  test('loadCollection loads existing collection from file', async () => {
    const testCollection: RequestCollection = {
      version: '1.0.0',
      requests: [
        {
          name: 'Test Request',
          method: 'GET',
          url: 'https://api.example.com/test',
          headers: { 'Content-Type': 'application/json' },
          body: '',
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      ],
    };

    // Create collection file
    const collectionPath = await MockRequestManager.getCollectionPath();
    fs.writeFileSync(collectionPath, JSON.stringify(testCollection, null, 2));

    const loadedCollection = await MockRequestManager.loadCollection();

    assert.strictEqual(loadedCollection.version, testCollection.version);
    assert.strictEqual(loadedCollection.requests.length, 1);
    assert.strictEqual(loadedCollection.requests[0].name, 'Test Request');
  });

  test('saveCollection writes collection to file', async () => {
    const testCollection: RequestCollection = {
      version: '1.0.0',
      requests: [
        {
          name: 'Test Request',
          method: 'POST',
          url: 'https://api.example.com/create',
          headers: { 'Content-Type': 'application/json' },
          body: '{"test": true}',
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      ],
    };

    await MockRequestManager.saveCollection(testCollection);

    const collectionPath = await MockRequestManager.getCollectionPath();
    assert.ok(fs.existsSync(collectionPath));

    const savedContent = fs.readFileSync(collectionPath, 'utf-8');
    const savedCollection = JSON.parse(savedContent);

    assert.deepStrictEqual(savedCollection, testCollection);
  });

  test('saveRequest adds new request to collection', async () => {
    const testRequest: HttpRequest = {
      name: 'New Request',
      method: 'PUT',
      url: 'https://api.example.com/update',
      headers: { Authorization: 'Bearer token' },
      body: '{"updated": true}',
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    await MockRequestManager.saveRequest(testRequest);

    const collection = await MockRequestManager.loadCollection();
    assert.strictEqual(collection.requests.length, 1);
    assert.deepStrictEqual(collection.requests[0], testRequest);
  });

  test('saveRequest replaces existing request with same name', async () => {
    const originalRequest: HttpRequest = {
      name: 'Test Request',
      method: 'GET',
      url: 'https://api.example.com/old',
      headers: {},
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    const updatedRequest: HttpRequest = {
      name: 'Test Request',
      method: 'POST',
      url: 'https://api.example.com/new',
      headers: { 'Content-Type': 'application/json' },
      body: '{"updated": true}',
      timestamp: '2025-01-01T01:00:00.000Z',
    };

    await MockRequestManager.saveRequest(originalRequest);
    await MockRequestManager.saveRequest(updatedRequest);

    const collection = await MockRequestManager.loadCollection();
    assert.strictEqual(collection.requests.length, 1);
    assert.deepStrictEqual(collection.requests[0], updatedRequest);
  });

  test('deleteRequest removes request from collection', async () => {
    const request1: HttpRequest = {
      name: 'Request 1',
      method: 'GET',
      url: 'https://api.example.com/1',
      headers: {},
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    const request2: HttpRequest = {
      name: 'Request 2',
      method: 'GET',
      url: 'https://api.example.com/2',
      headers: {},
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    await MockRequestManager.saveRequest(request1);
    await MockRequestManager.saveRequest(request2);

    await MockRequestManager.deleteRequest('Request 1');

    const collection = await MockRequestManager.loadCollection();
    assert.strictEqual(collection.requests.length, 1);
    assert.strictEqual(collection.requests[0].name, 'Request 2');
  });

  test('getRequestNames returns array of request names', async () => {
    const request1: HttpRequest = {
      name: 'Alpha Request',
      method: 'GET',
      url: 'https://api.example.com/alpha',
      headers: {},
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    const request2: HttpRequest = {
      name: 'Beta Request',
      method: 'GET',
      url: 'https://api.example.com/beta',
      headers: {},
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    await MockRequestManager.saveRequest(request1);
    await MockRequestManager.saveRequest(request2);

    const names = await MockRequestManager.getRequestNames();

    assert.strictEqual(names.length, 2);
    assert.ok(names.includes('Alpha Request'));
    assert.ok(names.includes('Beta Request'));
  });

  test('getRequest returns specific request by name', async () => {
    const testRequest: HttpRequest = {
      name: 'Specific Request',
      method: 'DELETE',
      url: 'https://api.example.com/delete/123',
      headers: { Authorization: 'Bearer token' },
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    await MockRequestManager.saveRequest(testRequest);

    const foundRequest = await MockRequestManager.getRequest('Specific Request');
    const notFoundRequest = await MockRequestManager.getRequest('Non-existent Request');

    assert.deepStrictEqual(foundRequest, testRequest);
    assert.strictEqual(notFoundRequest, undefined);
  });

  test('exportToFile creates export file with collection data', async () => {
    const testRequest: HttpRequest = {
      name: 'Export Test',
      method: 'GET',
      url: 'https://api.example.com/export',
      headers: {},
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    await MockRequestManager.saveRequest(testRequest);

    const exportPath = path.join(tempDir, 'export-test.json');
    await MockRequestManager.exportToFile(exportPath);

    assert.ok(fs.existsSync(exportPath));

    const exportedContent = fs.readFileSync(exportPath, 'utf-8');
    const exportedCollection = JSON.parse(exportedContent);

    assert.strictEqual(exportedCollection.requests.length, 1);
    assert.strictEqual(exportedCollection.requests[0].name, 'Export Test');
  });

  test('importFromFile adds requests from import file', async () => {
    const existingRequest: HttpRequest = {
      name: 'Existing Request',
      method: 'GET',
      url: 'https://api.example.com/existing',
      headers: {},
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    const importCollection: RequestCollection = {
      version: '1.0.0',
      requests: [
        {
          name: 'Imported Request',
          method: 'POST',
          url: 'https://api.example.com/imported',
          headers: { 'Content-Type': 'application/json' },
          body: '{"imported": true}',
          timestamp: '2025-01-01T01:00:00.000Z',
        },
      ],
    };

    // Save existing request
    await MockRequestManager.saveRequest(existingRequest);

    // Create import file
    const importPath = path.join(tempDir, 'import-test.json');
    fs.writeFileSync(importPath, JSON.stringify(importCollection, null, 2));

    // Import
    await MockRequestManager.importFromFile(importPath);

    // Verify both requests exist
    const collection = await MockRequestManager.loadCollection();
    assert.strictEqual(collection.requests.length, 2);

    const names = collection.requests.map((r) => r.name);
    assert.ok(names.includes('Existing Request'));
    assert.ok(names.includes('Imported Request'));
  });

  test('importFromFile skips duplicate request names', async () => {
    const originalRequest: HttpRequest = {
      name: 'Duplicate Request',
      method: 'GET',
      url: 'https://api.example.com/original',
      headers: {},
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    const importCollection: RequestCollection = {
      version: '1.0.0',
      requests: [
        {
          name: 'Duplicate Request',
          method: 'POST',
          url: 'https://api.example.com/duplicate',
          headers: { 'Content-Type': 'application/json' },
          timestamp: '2025-01-01T01:00:00.000Z',
        },
      ],
    };

    // Save original request
    await MockRequestManager.saveRequest(originalRequest);

    // Create import file
    const importPath = path.join(tempDir, 'duplicate-test.json');
    fs.writeFileSync(importPath, JSON.stringify(importCollection, null, 2));

    // Import
    await MockRequestManager.importFromFile(importPath);

    // Verify original request is preserved
    const collection = await MockRequestManager.loadCollection();
    assert.strictEqual(collection.requests.length, 1);
    assert.strictEqual(collection.requests[0].url, 'https://api.example.com/original');
  });
});
