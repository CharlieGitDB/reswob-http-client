// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import { getWebviewContent } from './webviewContent';

export interface HttpRequest {
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: string;
  collection?: string;
}

export interface RequestCollection {
  version: string;
  requests: HttpRequest[];
  collections: CollectionFolder[];
}

// Postman Collection Format interfaces
export interface PostmanCollection {
  info: {
    _postman_id?: string;
    name: string;
    schema: string;
    description?: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
}

export interface PostmanItem {
  name: string;
  request: PostmanRequest;
  response?: any[];
  event?: any[];
}

export interface PostmanRequest {
  method: string;
  header: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl | string;
}

export interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface PostmanBody {
  mode: 'raw' | 'formdata' | 'urlencoded';
  raw?: string;
  formdata?: any[];
  urlencoded?: any[];
}

export interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: PostmanQueryParam[];
}

export interface PostmanQueryParam {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
}

export interface CollectionFolder {
  name: string;
  requests: string[];
  color?: string;
}

export interface TreeItem {
  type: 'collection' | 'request';
  id: string;
  name: string;
  method?: string;
  collection?: string;
}

export class RequestManager {
  private static readonly REQUESTS_FOLDER = '.reswob-requests';
  private static readonly COLLECTION_FILE = 'requests.json';
  private static cachedCollection: RequestCollection | null = null;
  private static lastModified: number = 0;

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
        // Check if file was modified since last cache
        const stats = fs.statSync(collectionPath);
        const currentModified = stats.mtimeMs;

        if (this.cachedCollection && this.lastModified === currentModified) {
          return this.cachedCollection;
        }

        const content = fs.readFileSync(collectionPath, 'utf-8');
        const parsed = JSON.parse(content);

        // Ensure backward compatibility with existing files
        if (!parsed.collections) {
          parsed.collections = [];
        }

        // Update cache
        this.cachedCollection = parsed;
        this.lastModified = currentModified;

        return parsed;
      }
    } catch (error) {
      console.error('Error loading collection:', error);
    }

    const defaultCollection: RequestCollection = {
      version: '1.0.0',
      requests: [],
      collections: [],
    };

    // Cache default collection
    this.cachedCollection = defaultCollection;
    this.lastModified = 0;

    return defaultCollection;
  }

  static async saveCollection(collection: RequestCollection): Promise<void> {
    try {
      const collectionPath = await this.getCollectionPath();
      fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));

      // Update cache after successful save
      this.cachedCollection = collection;
      const stats = fs.statSync(collectionPath);
      this.lastModified = stats.mtimeMs;
    } catch (error) {
      console.error('Error saving collection:', error);
      throw error;
    }
  }

  static async saveRequest(request: HttpRequest): Promise<void> {
    const collection = await this.loadCollection();

    // Remove existing request with same name
    collection.requests = collection.requests.filter((r) => r.name !== request.name);

    // Add new request
    collection.requests.push(request);

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

    // Check if we should export in Postman format
    if (exportPath.endsWith('.postman_collection.json')) {
      const postmanCollection = this.convertToPostmanFormat(collection);
      fs.writeFileSync(exportPath, JSON.stringify(postmanCollection, null, 2));
    } else {
      // Export in our native format
      fs.writeFileSync(exportPath, JSON.stringify(collection, null, 2));
    }
  }

  static async importFromFile(importPath: string): Promise<void> {
    const content = fs.readFileSync(importPath, 'utf-8');
    const importedData = JSON.parse(content);

    // Check if this is a Postman collection
    if (this.isPostmanCollection(importedData)) {
      const convertedCollection = this.convertFromPostmanFormat(importedData as PostmanCollection);
      const currentCollection = await this.loadCollection();

      // Merge converted requests
      const existingNames = new Set(currentCollection.requests.map((r) => r.name));
      const newRequests = convertedCollection.requests.filter(
        (r: HttpRequest) => !existingNames.has(r.name)
      );
      currentCollection.requests.push(...newRequests);

      // Merge collections if they exist
      if (convertedCollection.collections) {
        const existingCollectionNames = new Set(currentCollection.collections.map((c) => c.name));
        const newCollections = convertedCollection.collections.filter(
          (c: CollectionFolder) => !existingCollectionNames.has(c.name)
        );
        currentCollection.collections.push(...newCollections);
      }

      await this.saveCollection(currentCollection);
    } else {
      // Handle our native format
      const importedCollection: RequestCollection = importedData;
      const currentCollection = await this.loadCollection();

      // Merge requests, avoiding duplicates by name
      const existingNames = new Set(currentCollection.requests.map((r) => r.name));
      const newRequests = importedCollection.requests.filter((r) => !existingNames.has(r.name));
      currentCollection.requests.push(...newRequests);

      // Merge collections, avoiding duplicates by name
      if (importedCollection.collections) {
        const existingCollectionNames = new Set(currentCollection.collections.map((c) => c.name));
        const newCollections = importedCollection.collections.filter(
          (c) => !existingCollectionNames.has(c.name)
        );
        currentCollection.collections.push(...newCollections);
      }

      await this.saveCollection(currentCollection);
    }
  }

  // Postman format conversion methods
  static isPostmanCollection(data: any): data is PostmanCollection {
    return (
      data &&
      data.info &&
      typeof data.info.name === 'string' &&
      Array.isArray(data.item) &&
      (data.info.schema?.includes('postman.com') || data.info.schema?.includes('getpostman.com'))
    );
  }

  static convertFromPostmanFormat(postmanCollection: PostmanCollection): RequestCollection {
    const requests: HttpRequest[] = [];
    const collections: CollectionFolder[] = [];

    // Extract requests from Postman items and track collections
    const collectionMap = new Map<string, string[]>(); // folder name -> request names
    this.extractRequestsFromPostmanItems(postmanCollection.item, requests, collectionMap);

    // Create collections from the map
    for (const [collectionName, requestNames] of collectionMap.entries()) {
      if (requestNames.length > 0) {
        collections.push({
          name: collectionName,
          requests: requestNames,
        });
      }
    }

    return {
      version: '1.0.0',
      requests,
      collections,
    };
  }

  static extractRequestsFromPostmanItems(
    items: PostmanItem[],
    requests: HttpRequest[],
    collectionMap: Map<string, string[]>,
    folderName: string = ''
  ): void {
    for (const item of items) {
      if (item.request) {
        // This is a request item
        const headers: Record<string, string> = {};

        if (item.request.header) {
          for (const header of item.request.header) {
            if (!header.disabled) {
              headers[header.key] = header.value;
            }
          }
        }

        let url: string;
        if (typeof item.request.url === 'string') {
          url = item.request.url;
        } else {
          url = item.request.url.raw;
        }

        let body: string | undefined;
        if (item.request.body?.mode === 'raw' && item.request.body.raw) {
          body = item.request.body.raw;
        }

        const requestName = folderName ? `${folderName} - ${item.name}` : item.name;

        const newRequest: HttpRequest = {
          name: requestName,
          method: item.request.method.toUpperCase(),
          url,
          headers,
          body,
          timestamp: new Date().toISOString(),
          collection: folderName || undefined,
        };

        requests.push(newRequest);

        // Track requests in collections
        if (folderName) {
          if (!collectionMap.has(folderName)) {
            collectionMap.set(folderName, []);
          }
          collectionMap.get(folderName)!.push(requestName);
        }
      } else if ((item as any).item) {
        // This is a folder with nested items
        const folderItem = item as any;
        this.extractRequestsFromPostmanItems(folderItem.item, requests, collectionMap, item.name);
      }
    }
  }

  static convertToPostmanFormat(collection: RequestCollection): PostmanCollection {
    const items: PostmanItem[] = [];

    // Group requests by collection
    const requestsByCollection = new Map<string, HttpRequest[]>();
    const uncategorizedRequests: HttpRequest[] = [];

    for (const request of collection.requests) {
      if (request.collection) {
        if (!requestsByCollection.has(request.collection)) {
          requestsByCollection.set(request.collection, []);
        }
        requestsByCollection.get(request.collection)!.push(request);
      } else {
        uncategorizedRequests.push(request);
      }
    }

    // Add uncategorized requests directly to the collection
    for (const request of uncategorizedRequests) {
      items.push(this.convertRequestToPostmanItem(request));
    }

    // Add collections as folders
    for (const [collectionName, requests] of requestsByCollection) {
      const folderItems = requests.map((request) => this.convertRequestToPostmanItem(request));
      items.push({
        name: collectionName,
        item: folderItems,
      } as any);
    }

    return {
      info: {
        _postman_id: this.generateUUID(),
        name: 'Reswob HTTP Client Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        description: 'Collection exported from Reswob HTTP Client',
      },
      item: items,
    };
  }

  static convertRequestToPostmanItem(request: HttpRequest): PostmanItem {
    const headers: PostmanHeader[] = [];
    for (const [key, value] of Object.entries(request.headers)) {
      headers.push({ key, value });
    }

    let body: PostmanBody | undefined;
    if (request.body) {
      body = {
        mode: 'raw',
        raw: request.body,
      };
    }

    return {
      name: request.name,
      request: {
        method: request.method,
        header: headers,
        body,
        url: request.url,
      },
    };
  }

  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  static async createCollection(name: string): Promise<void> {
    const collection = await this.loadCollection();

    // Check if collection already exists
    const existingCollection = collection.collections.find((c) => c.name === name);
    if (existingCollection) {
      throw new Error(`Collection '${name}' already exists`);
    }

    collection.collections.push({
      name,
      requests: [],
    });

    await this.saveCollection(collection);
  }

  static async deleteCollection(name: string): Promise<void> {
    const collection = await this.loadCollection();

    // Remove the collection
    collection.collections = collection.collections.filter((c) => c.name !== name);

    // Remove collection reference from requests
    collection.requests.forEach((request) => {
      if (request.collection === name) {
        delete request.collection;
      }
    });

    await this.saveCollection(collection);
  }

  static async deleteRequest(name: string, collectionName?: string): Promise<void> {
    const collection = await this.loadCollection();

    // Remove the request
    collection.requests = collection.requests.filter((r) => r.name !== name);

    await this.saveCollection(collection);
  }

  static async addRequestToCollection(requestName: string, collectionName: string): Promise<void> {
    const collection = await this.loadCollection();

    // Find the request
    const request = collection.requests.find((r) => r.name === requestName);
    if (!request) {
      throw new Error(`Request '${requestName}' not found`);
    }

    // Find the collection
    const targetCollection = collection.collections.find((c) => c.name === collectionName);
    if (!targetCollection) {
      throw new Error(`Collection '${collectionName}' not found`);
    }

    // Update request collection
    request.collection = collectionName;

    // Add to collection if not already there
    if (!targetCollection.requests.includes(requestName)) {
      targetCollection.requests.push(requestName);
    }

    await this.saveCollection(collection);
  }

  static async removeRequestFromCollection(requestName: string): Promise<void> {
    const collection = await this.loadCollection();

    // Find the request
    const request = collection.requests.find((r) => r.name === requestName);
    if (!request) {
      throw new Error(`Request '${requestName}' not found`);
    }

    const oldCollection = request.collection;

    // Remove collection reference from request
    delete request.collection;

    // Remove from collection's request list
    if (oldCollection) {
      const targetCollection = collection.collections.find((c) => c.name === oldCollection);
      if (targetCollection) {
        targetCollection.requests = targetCollection.requests.filter((r) => r !== requestName);
      }
    }

    await this.saveCollection(collection);
  }

  static invalidateCache(): void {
    this.cachedCollection = null;
    this.lastModified = 0;
  }
}

export class ReswobHttpClientViewProvider
  implements vscode.TreeDataProvider<TreeItem>, vscode.TreeDragAndDropController<TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> =
    new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  // Drag and drop support
  dropMimeTypes = ['application/vnd.code.tree.reswobHttpClientView'];
  dragMimeTypes = ['application/vnd.code.tree.reswobHttpClientView'];

  // Performance caching
  private cachedChildren: Map<string, TreeItem[]> = new Map();
  private cacheValid = false;

  refresh(): void {
    // Clear cache on refresh
    this.cachedChildren.clear();
    this.cacheValid = false;
    RequestManager.invalidateCache();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    switch (element.type) {
      case 'collection': {
        const item = new vscode.TreeItem(
          `📁 ${element.name}`,
          vscode.TreeItemCollapsibleState.Expanded
        );
        item.iconPath = new vscode.ThemeIcon('folder');
        item.contextValue = 'collection';
        item.tooltip = `Collection: ${element.name} (Drag requests here to organize)`;
        return item;
      }
      case 'request': {
        const method = element.method || 'GET';
        const methodBadge = this.getMethodBadge(method);
        const item = new vscode.TreeItem(
          `${methodBadge} ${element.name}`,
          vscode.TreeItemCollapsibleState.None
        );
        item.command = {
          command: 'reswob-http-client.loadRequest',
          title: 'Load Request',
          arguments: [element.name],
        };
        item.iconPath = new vscode.ThemeIcon('file');
        item.contextValue = 'saved-request';
        item.tooltip = `${method} Request: ${element.name}`;
        return item;
      }
      default:
        throw new Error(`Unknown tree item type: ${element.type}`);
    }
  }

  private getMethodBadge(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET':
        return '🟢';
      case 'POST':
        return '🟡';
      case 'PUT':
        return '🟠';
      case 'DELETE':
        return '🔴';
      case 'PATCH':
        return '🟣';
      case 'HEAD':
        return '🔵';
      case 'OPTIONS':
        return '⚪';
      default:
        return '⚫';
    }
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    try {
      // Create cache key
      const cacheKey = element ? `${element.type}:${element.name}` : 'root';

      // Check cache first (only for short-term caching during tree expansion)
      if (this.cacheValid && this.cachedChildren.has(cacheKey)) {
        return this.cachedChildren.get(cacheKey)!;
      }

      const collection = await RequestManager.loadCollection();
      let items: TreeItem[] = [];

      if (!element) {
        // Root level - show collections and uncategorized requests
        // Show collections
        for (const col of collection.collections) {
          items.push({
            type: 'collection',
            id: `collection:${col.name}`,
            name: col.name,
          });
        }

        // Show uncategorized requests
        const uncategorizedRequests = collection.requests.filter((req) => !req.collection);
        for (const request of uncategorizedRequests) {
          items.push({
            type: 'request',
            id: `request:${request.name}`,
            name: request.name,
            method: request.method,
          });
        }
      } else if (element.type === 'collection') {
        // Show requests in this collection
        const collectionName = element.name;
        const collectionFolder = collection.collections.find((c) => c.name === collectionName);

        if (collectionFolder) {
          for (const requestName of collectionFolder.requests) {
            const request = collection.requests.find((r) => r.name === requestName);
            if (request) {
              items.push({
                type: 'request',
                id: `request:${request.name}`,
                name: request.name,
                method: request.method,
                collection: collectionName,
              });
            }
          }
        }
      }

      // Cache the result temporarily
      this.cachedChildren.set(cacheKey, items);
      this.cacheValid = true;

      // Clear cache after a short delay to prevent stale data
      setTimeout(() => {
        this.cacheValid = false;
        this.cachedChildren.clear();
      }, 1000);

      return items;
    } catch (error) {
      console.error('Error getting tree children:', error);
      return [];
    }
  }

  // Drag and Drop implementation
  async handleDrag(source: TreeItem[], treeDataTransfer: vscode.DataTransfer): Promise<void> {
    treeDataTransfer.set(
      'application/vnd.code.tree.reswobHttpClientView',
      new vscode.DataTransferItem(source)
    );
  }

  async handleDrop(target: TreeItem | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
    const transferItem = dataTransfer.get('application/vnd.code.tree.reswobHttpClientView');
    if (!transferItem) {
      return;
    }

    const draggedItems = transferItem.value as TreeItem[];

    for (const item of draggedItems) {
      if (item.type === 'request') {
        try {
          if (target?.type === 'collection') {
            // Move request to collection
            await RequestManager.addRequestToCollection(item.name, target.name);
          } else {
            // Move request to root (uncategorized)
            await RequestManager.removeRequestFromCollection(item.name);
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to move request: ${error}`);
        }
      }
    }

    this.refresh();
  }

  // Delete functionality
  async deleteItem(element: TreeItem): Promise<void> {
    try {
      if (element.type === 'request') {
        const result = await vscode.window.showWarningMessage(
          `Are you sure you want to delete the request "${element.name}"?`,
          'Delete',
          'Cancel'
        );

        if (result === 'Delete') {
          await RequestManager.deleteRequest(element.name);
          this.refresh();
          vscode.window.showInformationMessage(`Request "${element.name}" deleted successfully!`);
        }
      } else if (element.type === 'collection') {
        const result = await vscode.window.showWarningMessage(
          `Are you sure you want to delete the collection "${element.name}"? This will not delete the requests inside.`,
          'Delete',
          'Cancel'
        );

        if (result === 'Delete') {
          await RequestManager.deleteCollection(element.name);
          this.refresh();
          vscode.window.showInformationMessage(
            `Collection "${element.name}" deleted successfully!`
          );
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete: ${error}`);
    }
  }
}

export class HttpClientWebviewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private static treeProvider: ReswobHttpClientViewProvider;

  public static setTreeProvider(provider: ReswobHttpClientViewProvider) {
    this.treeProvider = provider;
  }

  public static createOrShow(extensionUri: vscode.Uri, loadRequest?: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (HttpClientWebviewProvider.currentPanel) {
      HttpClientWebviewProvider.currentPanel.reveal(column);
      if (loadRequest) {
        // Load the specific request
        HttpClientWebviewProvider.loadRequestInWebview(loadRequest);
      }
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      'httpClient',
      'HTTP Client',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri, vscode.Uri.joinPath(extensionUri, 'dist', 'webview')],
      }
    );

    HttpClientWebviewProvider.currentPanel = panel;

    // Set the webview's initial html content
    panel.webview.html = getWebviewContent(panel.webview, extensionUri);

    // If a specific request should be loaded, do it after a short delay
    if (loadRequest) {
      setTimeout(() => HttpClientWebviewProvider.loadRequestInWebview(loadRequest), 100);
    }

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case 'sendRequest':
            HttpClientWebviewProvider.sendHttpRequest(message.data, panel.webview);
            break;
          case 'saveRequest':
            HttpClientWebviewProvider.saveRequest(message.data, panel.webview);
            break;
          case 'loadSavedRequests':
            HttpClientWebviewProvider.loadSavedRequests(panel.webview);
            break;
          case 'loadRequest':
            HttpClientWebviewProvider.loadRequestInWebview(message.data.name);
            break;
          case 'deleteRequest':
            HttpClientWebviewProvider.deleteRequest(message.data.name, panel.webview);
            break;
          case 'importRequests':
            HttpClientWebviewProvider.importRequestsFromWebview(panel.webview);
            break;
        }
      },
      undefined,
      []
    );

    // Reset when the current panel is closed
    panel.onDidDispose(
      () => {
        HttpClientWebviewProvider.currentPanel = undefined;
      },
      null,
      []
    );
  }

  private static async loadRequestInWebview(requestName: string) {
    if (!this.currentPanel) {
      return;
    }

    try {
      const request = await RequestManager.getRequest(requestName);
      if (request) {
        this.currentPanel.webview.postMessage({
          type: 'loadRequest',
          data: request,
        });
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load request: ${error}`);
    }
  }

  private static async saveRequest(data: any, webview: vscode.Webview) {
    try {
      const requestName = await vscode.window.showInputBox({
        prompt: 'Enter a name for this request',
        placeHolder: 'My API Request',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Request name cannot be empty';
          }
          return null;
        },
      });

      if (!requestName) {
        return;
      }

      const request: HttpRequest = {
        name: requestName,
        method: data.method,
        url: data.url,
        headers: data.headers || {},
        body: data.body,
        timestamp: new Date().toISOString(),
      };

      await RequestManager.saveRequest(request);

      // Refresh the tree view
      if (this.treeProvider) {
        this.treeProvider.refresh();
      }

      webview.postMessage({
        type: 'requestSaved',
        data: { name: requestName },
      });

      vscode.window.showInformationMessage(`Request "${requestName}" saved successfully!`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save request: ${error}`);
    }
  }

  private static async loadSavedRequests(webview: vscode.Webview) {
    try {
      const collection = await RequestManager.loadCollection();
      webview.postMessage({
        type: 'savedRequests',
        data: collection.requests,
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load saved requests: ${error}`);
    }
  }

  public static async importRequestsFromWebview(webview: vscode.Webview) {
    try {
      // Use the existing import command functionality
      await vscode.commands.executeCommand('reswob-http-client.importRequests');
      webview.postMessage({ type: 'importSuccess', message: 'Requests imported successfully' });
    } catch (error) {
      console.error('Error importing requests:', error);
      webview.postMessage({ type: 'importError', message: 'Failed to import requests' });
    }
  }

  private static async deleteRequest(requestName: string, webview: vscode.Webview) {
    try {
      const result = await vscode.window.showWarningMessage(
        `Are you sure you want to delete the request "${requestName}"?`,
        'Delete',
        'Cancel'
      );

      if (result === 'Delete') {
        await RequestManager.deleteRequest(requestName);

        // Refresh the tree view
        if (this.treeProvider) {
          this.treeProvider.refresh();
        }

        // Refresh the saved requests list in webview
        this.loadSavedRequests(webview);

        vscode.window.showInformationMessage(`Request "${requestName}" deleted successfully!`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete request: ${error}`);
    }
  }

  private static async sendHttpRequest(data: any, webview: vscode.Webview) {
    try {
      const parsedUrl = new URL(data.url);
      const isHttps = parsedUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: data.method || 'GET',
        headers: {
          'User-Agent': 'Reswob HTTP Client (VS Code Extension)',
          ...data.headers,
        },
      };

      // Add Content-Length header if there's a body
      if (data.body && typeof data.body === 'string') {
        options.headers['Content-Length'] = Buffer.byteLength(data.body);
      }

      const startTime = Date.now();

      const response = await new Promise<any>((resolve, reject) => {
        const req = httpModule.request(options, (res) => {
          let responseBody = '';

          res.on('data', (chunk) => {
            responseBody += chunk;
          });

          res.on('end', () => {
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Try to parse JSON response
            let parsedBody;
            try {
              parsedBody = JSON.parse(responseBody);
            } catch {
              parsedBody = responseBody;
            }

            resolve({
              status: res.statusCode,
              statusText: res.statusMessage,
              headers: res.headers,
              body: parsedBody,
              responseTime,
              size: Buffer.byteLength(responseBody),
            });
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        // Set timeout (30 seconds)
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout (30s)'));
        });

        // Write body if present
        if (data.body && typeof data.body === 'string') {
          req.write(data.body);
        }

        req.end();
      });

      webview.postMessage({
        type: 'response',
        data: response,
      });
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - Date.now();

      webview.postMessage({
        type: 'response',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 0,
          responseTime,
        },
      });
    }
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "reswob-http-client" is now active!');

  // Register the tree data provider for the sidebar with drag and drop support
  const provider = new ReswobHttpClientViewProvider();
  const disposable = vscode.window.createTreeView('reswobHttpClientView', {
    treeDataProvider: provider,
    dragAndDropController: provider,
    canSelectMany: false,
  });

  // Set the tree provider reference for the webview
  HttpClientWebviewProvider.setTreeProvider(provider);

  // Register commands
  const openHttpClientCommand = vscode.commands.registerCommand(
    'reswob-http-client.openHttpClient',
    () => {
      HttpClientWebviewProvider.createOrShow(context.extensionUri);
    }
  );

  const loadRequestCommand = vscode.commands.registerCommand(
    'reswob-http-client.loadRequest',
    (requestName: string) => {
      HttpClientWebviewProvider.createOrShow(context.extensionUri, requestName);
    }
  );

  const deleteRequestCommand = vscode.commands.registerCommand(
    'reswob-http-client.deleteRequest',
    async (item: TreeItem) => {
      await provider.deleteItem(item);
    }
  );

  const deleteCollectionCommand = vscode.commands.registerCommand(
    'reswob-http-client.deleteCollection',
    async (item: TreeItem) => {
      await provider.deleteItem(item);
    }
  );

  const createCollectionCommand = vscode.commands.registerCommand(
    'reswob-http-client.createCollection',
    async () => {
      const collectionName = await vscode.window.showInputBox({
        prompt: 'Enter a name for the new collection',
        placeHolder: 'My Collection',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Collection name cannot be empty';
          }
          return null;
        },
      });

      if (collectionName) {
        try {
          await RequestManager.createCollection(collectionName);
          provider.refresh();
          vscode.window.showInformationMessage(
            `Collection "${collectionName}" created successfully!`
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to create collection: ${error}`);
        }
      }
    }
  );

  const addToCollectionCommand = vscode.commands.registerCommand(
    'reswob-http-client.addToCollection',
    async (item: TreeItem) => {
      if (item.type !== 'request') {
        return;
      }

      try {
        const collection = await RequestManager.loadCollection();
        const collectionNames = collection.collections.map((c) => c.name);

        if (collectionNames.length === 0) {
          vscode.window.showWarningMessage('No collections available. Create a collection first.');
          return;
        }

        const selectedCollection = await vscode.window.showQuickPick(collectionNames, {
          placeHolder: 'Select a collection to add the request to',
        });

        if (selectedCollection) {
          await RequestManager.addRequestToCollection(item.name, selectedCollection);
          provider.refresh();
          vscode.window.showInformationMessage(
            `Request "${item.name}" added to collection "${selectedCollection}"`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to add request to collection: ${error}`);
      }
    }
  );

  const removeFromCollectionCommand = vscode.commands.registerCommand(
    'reswob-http-client.removeFromCollection',
    async (item: TreeItem) => {
      if (item.type !== 'request') {
        return;
      }

      try {
        await RequestManager.removeRequestFromCollection(item.name);
        provider.refresh();
        vscode.window.showInformationMessage(`Request "${item.name}" removed from collection`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to remove request from collection: ${error}`);
      }
    }
  );

  const exportRequestsCommand = vscode.commands.registerCommand(
    'reswob-http-client.exportRequests',
    async () => {
      try {
        const saveUri = await vscode.window.showSaveDialog({
          filters: {
            'Postman Collection': ['postman_collection.json'],
            'Reswob Collection': ['json'],
            'All files': ['*'],
          },
          defaultUri: vscode.Uri.file('requests.postman_collection.json'),
        });

        if (saveUri) {
          await RequestManager.exportToFile(saveUri.fsPath);

          const isPostmanFormat = saveUri.fsPath.endsWith('.postman_collection.json');
          const formatName = isPostmanFormat ? 'Postman collection' : 'Reswob collection';
          vscode.window.showInformationMessage(`Requests exported successfully as ${formatName}!`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to export requests: ${error}`);
      }
    }
  );

  const importRequestsCommand = vscode.commands.registerCommand(
    'reswob-http-client.importRequests',
    async () => {
      try {
        const openUri = await vscode.window.showOpenDialog({
          filters: {
            'Collection files': ['json', 'postman_collection.json'],
            'Postman Collection': ['postman_collection.json'],
            'Reswob Collection': ['json'],
            'All files': ['*'],
          },
          canSelectMany: false,
        });

        if (openUri && openUri.length > 0) {
          await RequestManager.importFromFile(openUri[0].fsPath);
          provider.refresh();

          const fileName = openUri[0].fsPath.split(/[\\/]/).pop();
          const isPostmanFormat = fileName?.endsWith('.postman_collection.json');
          const formatName = isPostmanFormat ? 'Postman collection' : 'collection';
          vscode.window.showInformationMessage(`${formatName} imported successfully!`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to import requests: ${error}`);
      }
    }
  );

  const helloWorldCommand = vscode.commands.registerCommand('reswob-http-client.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World from reswob-http-client!');
  });

  context.subscriptions.push(
    disposable,
    openHttpClientCommand,
    loadRequestCommand,
    deleteRequestCommand,
    deleteCollectionCommand,
    createCollectionCommand,
    addToCollectionCommand,
    removeFromCollectionCommand,
    exportRequestsCommand,
    importRequestsCommand,
    helloWorldCommand
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
