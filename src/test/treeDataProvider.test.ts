import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

interface TreeItem {
  type: 'new-request' | 'collection' | 'request';
  id: string;
  name: string;
  method?: string;
  collection?: string;
}

// Mock TreeDataProvider implementation for testing
class MockReswobHttpClientViewProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> =
    new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private mockRequestNames: string[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setMockRequestNames(names: string[]) {
    this.mockRequestNames = names;
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

  getTreeItem(element: TreeItem): vscode.TreeItem {
    switch (element.type) {
      case 'new-request': {
        const item = new vscode.TreeItem('New Request', vscode.TreeItemCollapsibleState.None);
        item.command = {
          command: 'reswob-http-client.openHttpClient',
          title: 'Open HTTP Client',
          arguments: [],
        };
        item.iconPath = new vscode.ThemeIcon('add');
        item.contextValue = 'new-request';
        return item;
      }
      case 'collection': {
        const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Expanded);
        item.iconPath = new vscode.ThemeIcon('folder');
        item.contextValue = 'collection';
        item.tooltip = `Collection: ${element.name}`;
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
        throw new Error(`Unknown tree item type: ${(element as any).type}`);
    }
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      const items: TreeItem[] = [];

      // Always show "New Request" first
      items.push({ type: 'new-request', id: 'new-request', name: 'New Request' });

      // Show mock requests
      for (const requestName of this.mockRequestNames) {
        items.push({
          type: 'request',
          id: `request:${requestName}`,
          name: requestName,
          method: 'GET', // Default method for tests
        });
      }

      return items;
    }
    return [];
  }
}

suite('TreeDataProvider Test Suite', () => {
  let sandbox: sinon.SinonSandbox;
  let treeProvider: MockReswobHttpClientViewProvider;
  let eventSpy: sinon.SinonSpy;

  setup(() => {
    sandbox = sinon.createSandbox();
    treeProvider = new MockReswobHttpClientViewProvider();

    // Spy on the event emitter
    eventSpy = sandbox.spy();
    treeProvider.onDidChangeTreeData(eventSpy);
  });

  teardown(() => {
    sandbox.restore();
  });

  test('getTreeItem creates correct new request item', () => {
    const newRequestItem: TreeItem = {
      type: 'new-request',
      id: 'new-request',
      name: 'New Request',
    };
    const item = treeProvider.getTreeItem(newRequestItem);

    assert.strictEqual(item.label, 'New Request');
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
    assert.ok(item.command);
    assert.strictEqual(item.command!.command, 'reswob-http-client.openHttpClient');
    assert.strictEqual(item.command!.title, 'Open HTTP Client');
    assert.deepStrictEqual(item.command!.arguments, []);
    assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'add');
    assert.strictEqual(item.contextValue, 'new-request');
  });

  test('getTreeItem creates correct saved request item', () => {
    const requestItem: TreeItem = {
      type: 'request',
      id: 'request:Test Request',
      name: 'Test Request',
      method: 'POST',
    };
    const item = treeProvider.getTreeItem(requestItem);

    assert.strictEqual(item.label, '🟡 Test Request');
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
    assert.ok(item.command);
    assert.strictEqual(item.command!.command, 'reswob-http-client.loadRequest');
    assert.strictEqual(item.command!.title, 'Load Request');
    assert.deepStrictEqual(item.command!.arguments, ['Test Request']);
    assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'file');
    assert.strictEqual(item.contextValue, 'saved-request');
    assert.strictEqual(item.tooltip, 'POST Request: Test Request');
  });

  test('getTreeItem creates correct collection item', () => {
    const collectionItem: TreeItem = {
      type: 'collection',
      id: 'collection:My Collection',
      name: 'My Collection',
    };
    const item = treeProvider.getTreeItem(collectionItem);

    assert.strictEqual(item.label, 'My Collection');
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
    assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'folder');
    assert.strictEqual(item.contextValue, 'collection');
    assert.strictEqual(item.tooltip, 'Collection: My Collection');
  });

  test('getChildren returns new request and saved requests for root', async () => {
    const mockRequests = ['Request 1', 'Request 2', 'Request 3'];
    treeProvider.setMockRequestNames(mockRequests);

    const children = await treeProvider.getChildren();

    assert.strictEqual(children.length, 4); // new-request + 3 saved requests
    assert.strictEqual(children[0].type, 'new-request');
    assert.strictEqual(children[0].name, 'New Request');
    assert.strictEqual(children[1].type, 'request');
    assert.strictEqual(children[1].name, 'Request 1');
    assert.strictEqual(children[2].type, 'request');
    assert.strictEqual(children[2].name, 'Request 2');
    assert.strictEqual(children[3].type, 'request');
    assert.strictEqual(children[3].name, 'Request 3');
  });

  test('getChildren returns empty array for non-root elements', async () => {
    const mockItem: TreeItem = {
      type: 'request',
      id: 'request:some-request',
      name: 'some-request',
    };
    const children = await treeProvider.getChildren(mockItem);

    assert.strictEqual(children.length, 0);
  });

  test('getChildren handles no saved requests', async () => {
    treeProvider.setMockRequestNames([]);

    const children = await treeProvider.getChildren();

    assert.strictEqual(children.length, 1);
    assert.strictEqual(children[0].type, 'new-request');
  });

  test('refresh fires onDidChangeTreeData event', () => {
    treeProvider.refresh();

    assert.ok(eventSpy.calledOnce);
  });

  test('refresh can be called multiple times', () => {
    treeProvider.refresh();
    treeProvider.refresh();
    treeProvider.refresh();

    assert.strictEqual(eventSpy.callCount, 3);
  });

  test('getTreeItem handles different HTTP methods with correct badges', () => {
    const methods = [
      { method: 'GET', expectedBadge: '🟢' },
      { method: 'POST', expectedBadge: '🟡' },
      { method: 'PUT', expectedBadge: '🟠' },
      { method: 'DELETE', expectedBadge: '🔴' },
      { method: 'PATCH', expectedBadge: '🟣' },
      { method: 'HEAD', expectedBadge: '🔵' },
      { method: 'OPTIONS', expectedBadge: '⚪' },
      { method: 'UNKNOWN', expectedBadge: '⚫' },
    ];

    methods.forEach(({ method, expectedBadge }) => {
      const requestItem: TreeItem = {
        type: 'request',
        id: `request:${method} Request`,
        name: `${method} Request`,
        method,
      };
      const item = treeProvider.getTreeItem(requestItem);
      assert.strictEqual(item.label, `${expectedBadge} ${method} Request`);
    });
  });

  test('getTreeItem handles request without method (defaults to GET)', () => {
    const requestItem: TreeItem = {
      type: 'request',
      id: 'request:No Method Request',
      name: 'No Method Request',
    };
    const item = treeProvider.getTreeItem(requestItem);

    assert.strictEqual(item.label, '🟢 No Method Request');
    assert.strictEqual(item.tooltip, 'GET Request: No Method Request');
  });

  test('event emitter is properly exposed', () => {
    assert.ok(treeProvider.onDidChangeTreeData);
    assert.strictEqual(typeof treeProvider.onDidChangeTreeData, 'function');
  });

  test('getChildren maintains order of requests', async () => {
    const orderedRequests = ['Alpha', 'Beta', 'Charlie', 'Delta'];
    treeProvider.setMockRequestNames(orderedRequests);

    const children = await treeProvider.getChildren();

    // Skip first element (new-request) and check order
    const requestChildren = children.slice(1);
    assert.strictEqual(requestChildren.length, 4);
    orderedRequests.forEach((expectedName, index) => {
      assert.strictEqual(requestChildren[index].name, expectedName);
      assert.strictEqual(requestChildren[index].type, 'request');
    });
  });

  test('tree provider handles special characters in request names', () => {
    const specialNames = [
      'Request with spaces',
      'Request-with-dashes',
      'Request_with_underscores',
      'Request with émojis 🚀',
      'Request/with/slashes',
    ];

    specialNames.forEach((name) => {
      const requestItem: TreeItem = {
        type: 'request',
        id: `request:${name}`,
        name,
        method: 'GET',
      };
      const item = treeProvider.getTreeItem(requestItem);
      assert.strictEqual(item.label, `🟢 ${name}`);
      assert.deepStrictEqual(item.command!.arguments, [name]);
    });
  });
});
