import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

// Mock TreeDataProvider implementation for testing
class MockReswobHttpClientViewProvider implements vscode.TreeDataProvider<string> {
  private _onDidChangeTreeData: vscode.EventEmitter<string | undefined | null | void> =
    new vscode.EventEmitter<string | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<string | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private mockRequestNames: string[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setMockRequestNames(names: string[]) {
    this.mockRequestNames = names;
  }

  getTreeItem(element: string): vscode.TreeItem {
    if (element === 'new-request') {
      const item = new vscode.TreeItem('+ New Request', vscode.TreeItemCollapsibleState.None);
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
      return ['new-request', ...this.mockRequestNames];
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
    const item = treeProvider.getTreeItem('new-request');

    assert.strictEqual(item.label, '+ New Request');
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
    assert.ok(item.command);
    assert.strictEqual(item.command!.command, 'reswob-http-client.openHttpClient');
    assert.strictEqual(item.command!.title, 'Open HTTP Client');
    assert.deepStrictEqual(item.command!.arguments, []);
    assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'add');
  });

  test('getTreeItem creates correct saved request item', () => {
    const requestName = 'Test Request';
    const item = treeProvider.getTreeItem(requestName);

    assert.strictEqual(item.label, requestName);
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
    assert.ok(item.command);
    assert.strictEqual(item.command!.command, 'reswob-http-client.loadRequest');
    assert.strictEqual(item.command!.title, 'Load Request');
    assert.deepStrictEqual(item.command!.arguments, [requestName]);
    assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'file');
    assert.strictEqual(item.contextValue, 'saved-request');
  });

  test('getChildren returns new request and saved requests for root', async () => {
    const mockRequests = ['Request 1', 'Request 2', 'Request 3'];
    treeProvider.setMockRequestNames(mockRequests);

    const children = await treeProvider.getChildren();

    assert.strictEqual(children.length, 4); // new-request + 3 saved requests
    assert.strictEqual(children[0], 'new-request');
    assert.strictEqual(children[1], 'Request 1');
    assert.strictEqual(children[2], 'Request 2');
    assert.strictEqual(children[3], 'Request 3');
  });

  test('getChildren returns empty array for non-root elements', async () => {
    const children = await treeProvider.getChildren('some-request');

    assert.strictEqual(children.length, 0);
  });

  test('getChildren handles no saved requests', async () => {
    treeProvider.setMockRequestNames([]);

    const children = await treeProvider.getChildren();

    assert.strictEqual(children.length, 1);
    assert.strictEqual(children[0], 'new-request');
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

  test('getTreeItem handles special characters in request names', () => {
    const specialNames = [
      'Request with spaces',
      'Request-with-dashes',
      'Request_with_underscores',
      'Request with émojis 🚀',
      'Request/with/slashes',
    ];

    specialNames.forEach((name) => {
      const item = treeProvider.getTreeItem(name);
      assert.strictEqual(item.label, name);
      assert.deepStrictEqual(item.command!.arguments, [name]);
    });
  });

  test('getTreeItem is consistent for same input', () => {
    const requestName = 'Consistent Request';

    const item1 = treeProvider.getTreeItem(requestName);
    const item2 = treeProvider.getTreeItem(requestName);

    // Properties should be the same
    assert.strictEqual(item1.label, item2.label);
    assert.strictEqual(item1.collapsibleState, item2.collapsibleState);
    assert.strictEqual(item1.contextValue, item2.contextValue);
    assert.deepStrictEqual(item1.command, item2.command);
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
    assert.deepStrictEqual(requestChildren, orderedRequests);
  });

  test('tree provider handles empty string request name', () => {
    const item = treeProvider.getTreeItem('');

    assert.strictEqual(item.label, '');
    assert.strictEqual(item.contextValue, 'saved-request');
    assert.ok(item.command);
    assert.deepStrictEqual(item.command!.arguments, ['']);
  });
});
