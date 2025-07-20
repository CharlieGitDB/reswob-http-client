// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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

class RequestManager {
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
			requests: []
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
		collection.requests = collection.requests.filter(r => r.name !== request.name);
		
		// Add new request
		collection.requests.push(request);
		
		await this.saveCollection(collection);
	}

	static async deleteRequest(name: string): Promise<void> {
		const collection = await this.loadCollection();
		collection.requests = collection.requests.filter(r => r.name !== name);
		await this.saveCollection(collection);
	}

	static async getRequestNames(): Promise<string[]> {
		const collection = await this.loadCollection();
		return collection.requests.map(r => r.name);
	}

	static async getRequest(name: string): Promise<HttpRequest | undefined> {
		const collection = await this.loadCollection();
		return collection.requests.find(r => r.name === name);
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
		const existingNames = new Set(currentCollection.requests.map(r => r.name));
		const newRequests = importedCollection.requests.filter(r => !existingNames.has(r.name));
		
		currentCollection.requests.push(...newRequests);
		await this.saveCollection(currentCollection);
	}
}

class ReswobHttpClientViewProvider implements vscode.TreeDataProvider<string> {
	private _onDidChangeTreeData: vscode.EventEmitter<string | undefined | null | void> = new vscode.EventEmitter<string | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<string | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
	
	getTreeItem(element: string): vscode.TreeItem {
		if (element === 'new-request') {
			const item = new vscode.TreeItem('+ New Request', vscode.TreeItemCollapsibleState.None);
			item.command = {
				command: 'reswob-http-client.openHttpClient',
				title: 'Open HTTP Client',
				arguments: []
			};
			item.iconPath = new vscode.ThemeIcon('add');
			return item;
		}

		const item = new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.None);
		item.command = {
			command: 'reswob-http-client.loadRequest',
			title: 'Load Request',
			arguments: [element]
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

class HttpClientWebviewProvider {
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
				localResourceRoots: [extensionUri]
			}
		);

		HttpClientWebviewProvider.currentPanel = panel;

		// Set the webview's initial html content
		panel.webview.html = HttpClientWebviewProvider.getWebviewContent(panel.webview);

		// If a specific request should be loaded, do it after a short delay
		if (loadRequest) {
			setTimeout(() => HttpClientWebviewProvider.loadRequestInWebview(loadRequest), 100);
		}

		// Handle messages from the webview
		panel.webview.onDidReceiveMessage(
			message => {
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
					data: request
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
				}
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
				timestamp: new Date().toISOString()
			};

			await RequestManager.saveRequest(request);
			
			// Refresh the tree view
			if (this.treeProvider) {
				this.treeProvider.refresh();
			}

			webview.postMessage({
				type: 'requestSaved',
				data: { name: requestName }
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
				data: collection.requests
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

	private static getWebviewContent(webview: vscode.Webview): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTTP Client</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-input-border);
            padding-bottom: 15px;
        }
        .button-group {
            display: flex;
            gap: 10px;
        }
        .main-content {
            display: flex;
            gap: 20px;
        }
        .request-form {
            flex: 2;
        }
        .saved-requests {
            flex: 1;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            padding: 15px;
            max-height: 600px;
            overflow-y: auto;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        select, input, textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 3px;
            box-sizing: border-box;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .secondary-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .secondary-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .response {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            max-height: 400px;
            overflow-y: auto;
        }
        .saved-request-item {
            padding: 8px;
            margin-bottom: 5px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .saved-request-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .saved-request-info {
            flex: 1;
        }
        .saved-request-method {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .saved-request-url {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 2px;
        }
        .delete-button {
            background-color: var(--vscode-errorForeground);
            color: white;
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 2px;
        }
        .delete-button:hover {
            background-color: var(--vscode-errorForeground);
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>HTTP Client</h1>
            <div class="button-group">
                <button onclick="saveRequest()" class="secondary-button">💾 Save Request</button>
                <button onclick="loadSavedRequests()">📁 Refresh Saved</button>
            </div>
        </div>
        
        <div class="main-content">
            <div class="request-form">
                <div class="form-group">
                    <label for="method">Method:</label>
                    <select id="method">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="url">URL:</label>
                    <input type="text" id="url" placeholder="https://api.example.com/endpoint" />
                </div>
                
                <div class="form-group">
                    <label for="headers">Headers (JSON):</label>
                    <textarea id="headers" rows="4" placeholder='{"Content-Type": "application/json"}'></textarea>
                </div>
                
                <div class="form-group">
                    <label for="body">Body:</label>
                    <textarea id="body" rows="6" placeholder='{"key": "value"}'></textarea>
                </div>
                
                <button onclick="sendRequest()">🚀 Send Request</button>
                
                <div id="response" class="response" style="display: none;"></div>
            </div>
            
            <div class="saved-requests">
                <h3>Saved Requests</h3>
                <div id="savedRequestsList">
                    <p>Loading saved requests...</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Load saved requests on startup
        window.addEventListener('load', () => {
            loadSavedRequests();
        });
        
        function sendRequest() {
            const method = document.getElementById('method').value;
            const url = document.getElementById('url').value;
            const headers = document.getElementById('headers').value;
            const body = document.getElementById('body').value;
            
            if (!url.trim()) {
                alert('Please enter a URL');
                return;
            }
            
            try {
                const data = {
                    method,
                    url,
                    headers: headers ? JSON.parse(headers) : {},
                    body: body || undefined
                };
                
                vscode.postMessage({
                    type: 'sendRequest',
                    data: data
                });
            } catch (error) {
                alert('Invalid JSON in headers: ' + error.message);
            }
        }
        
        function saveRequest() {
            const method = document.getElementById('method').value;
            const url = document.getElementById('url').value;
            const headers = document.getElementById('headers').value;
            const body = document.getElementById('body').value;
            
            if (!url.trim()) {
                alert('Please enter a URL to save');
                return;
            }
            
            try {
                const data = {
                    method,
                    url,
                    headers: headers ? JSON.parse(headers) : {},
                    body: body || undefined
                };
                
                vscode.postMessage({
                    type: 'saveRequest',
                    data: data
                });
            } catch (error) {
                alert('Invalid JSON in headers: ' + error.message);
            }
        }
        
        function loadSavedRequests() {
            vscode.postMessage({
                type: 'loadSavedRequests'
            });
        }
        
        function loadRequest(request) {
            document.getElementById('method').value = request.method;
            document.getElementById('url').value = request.url;
            document.getElementById('headers').value = JSON.stringify(request.headers, null, 2);
            document.getElementById('body').value = request.body || '';
        }
        
        function deleteRequest(name) {
            vscode.postMessage({
                type: 'deleteRequest',
                data: { name }
            });
        }
        
        function displaySavedRequests(requests) {
            const container = document.getElementById('savedRequestsList');
            
            if (requests.length === 0) {
                container.innerHTML = '<p>No saved requests found.</p>';
                return;
            }
            
            container.innerHTML = requests.map(request => \`
                <div class="saved-request-item">
                    <div class="saved-request-info" onclick="loadRequestFromList('\${request.name}')">
                        <div class="saved-request-method">\${request.method} \${request.name}</div>
                        <div class="saved-request-url">\${request.url}</div>
                    </div>
                    <button class="delete-button" onclick="deleteRequest('\${request.name}')">×</button>
                </div>
            \`).join('');
        }
        
        function loadRequestFromList(name) {
            vscode.postMessage({
                type: 'loadRequest',
                data: { name }
            });
        }
        
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'response':
                    displayResponse(message.data);
                    break;
                case 'savedRequests':
                    displaySavedRequests(message.data);
                    break;
                case 'loadRequest':
                    loadRequest(message.data);
                    break;
                case 'requestSaved':
                    loadSavedRequests(); // Refresh the saved requests list
                    break;
            }
        });
        
        function displayResponse(response) {
            const responseDiv = document.getElementById('response');
            responseDiv.textContent = JSON.stringify(response, null, 2);
            responseDiv.style.display = 'block';
        }
    </script>
</body>
</html>`;
	}

	private static async sendHttpRequest(data: any, webview: vscode.Webview) {
		try {
			// Here you would implement the actual HTTP request logic
			// For now, we'll just show a mock response
			const response = {
				status: 200,
				headers: {
					'content-type': 'application/json'
				},
				body: {
					message: 'Mock response - implement actual HTTP client here',
					request: data
				}
			};

			webview.postMessage({
				type: 'response',
				data: response
			});
		} catch (error) {
			webview.postMessage({
				type: 'response',
				data: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
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
	const openHttpClientCommand = vscode.commands.registerCommand('reswob-http-client.openHttpClient', () => {
		HttpClientWebviewProvider.createOrShow(context.extensionUri);
	});

	const loadRequestCommand = vscode.commands.registerCommand('reswob-http-client.loadRequest', (requestName: string) => {
		HttpClientWebviewProvider.createOrShow(context.extensionUri, requestName);
	});

	const exportRequestsCommand = vscode.commands.registerCommand('reswob-http-client.exportRequests', async () => {
		try {
			const saveUri = await vscode.window.showSaveDialog({
				filters: {
					'JSON files': ['json']
				},
				defaultUri: vscode.Uri.file('reswob-requests.json')
			});

			if (saveUri) {
				await RequestManager.exportToFile(saveUri.fsPath);
				vscode.window.showInformationMessage('Requests exported successfully!');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to export requests: ${error}`);
		}
	});

	const importRequestsCommand = vscode.commands.registerCommand('reswob-http-client.importRequests', async () => {
		try {
			const openUri = await vscode.window.showOpenDialog({
				filters: {
					'JSON files': ['json']
				},
				canSelectMany: false
			});

			if (openUri && openUri.length > 0) {
				await RequestManager.importFromFile(openUri[0].fsPath);
				provider.refresh();
				vscode.window.showInformationMessage('Requests imported successfully!');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to import requests: ${error}`);
		}
	});

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
