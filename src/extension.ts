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
}

export interface RequestCollection {
  version: string;
  requests: HttpRequest[];
}

export class RequestManager {
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

    // Remove existing request with same name
    collection.requests = collection.requests.filter((r) => r.name !== request.name);

    // Add new request
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

    // Merge requests, avoiding duplicates by name
    const existingNames = new Set(currentCollection.requests.map((r) => r.name));
    const newRequests = importedCollection.requests.filter((r) => !existingNames.has(r.name));

    currentCollection.requests.push(...newRequests);
    await this.saveCollection(currentCollection);
  }
}

export class ReswobHttpClientViewProvider implements vscode.TreeDataProvider<string> {
  private _onDidChangeTreeData: vscode.EventEmitter<string | undefined | null | void> =
    new vscode.EventEmitter<string | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<string | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: string): vscode.TreeItem {
    if (element === 'new-request') {
      const item = new vscode.TreeItem('New Request', vscode.TreeItemCollapsibleState.None);
      item.command = {
        command: 'reswob-http-client.openHttpClient',
        title: 'Open HTTP Client',
        arguments: [],
      };
      item.iconPath = new vscode.ThemeIcon('add');
      return item;
    }

    const item = new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.None);
    item.command = {
      command: 'reswob-http-client.loadRequest',
      title: 'Load Request',
      arguments: [element],
    };
    item.iconPath = new vscode.ThemeIcon('file');
    item.contextValue = 'saved-request';
    return item;
  }

  async getChildren(element?: string): Promise<string[]> {
    if (!element) {
      try {
        const requestNames = await RequestManager.getRequestNames();
        return ['new-request', ...requestNames];
      } catch (error) {
        return ['new-request'];
      }
    }
    return [];
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
        localResourceRoots: [extensionUri, vscode.Uri.joinPath(extensionUri, 'src', 'webview')],
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

  // Register the tree data provider for the sidebar
  const provider = new ReswobHttpClientViewProvider();
  vscode.window.registerTreeDataProvider('reswobHttpClientView', provider);

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

  const exportRequestsCommand = vscode.commands.registerCommand(
    'reswob-http-client.exportRequests',
    async () => {
      try {
        const saveUri = await vscode.window.showSaveDialog({
          filters: {
            'JSON files': ['json'],
          },
          defaultUri: vscode.Uri.file('reswob-requests.json'),
        });

        if (saveUri) {
          await RequestManager.exportToFile(saveUri.fsPath);
          vscode.window.showInformationMessage('Requests exported successfully!');
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
            'JSON files': ['json'],
          },
          canSelectMany: false,
        });

        if (openUri && openUri.length > 0) {
          await RequestManager.importFromFile(openUri[0].fsPath);
          provider.refresh();
          vscode.window.showInformationMessage('Requests imported successfully!');
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
    openHttpClientCommand,
    loadRequestCommand,
    exportRequestsCommand,
    importRequestsCommand,
    helloWorldCommand
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
