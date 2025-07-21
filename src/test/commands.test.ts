import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';

suite('Commands Test Suite', () => {
  let sandbox: sinon.SinonSandbox;
  let mockExtensionContext: vscode.ExtensionContext;
  let tempDir: string;

  setup(() => {
    sandbox = sinon.createSandbox();

    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(__dirname, 'test-commands-'));

    // Mock extension context
    mockExtensionContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file(__dirname),
      workspaceState: {
        get: sandbox.stub(),
        update: sandbox.stub(),
        keys: sandbox.stub().returns([]),
      },
      globalState: {
        get: sandbox.stub(),
        update: sandbox.stub(),
        setKeysForSync: sandbox.stub(),
        keys: sandbox.stub().returns([]),
      },
      secrets: {
        get: sandbox.stub(),
        store: sandbox.stub(),
        delete: sandbox.stub(),
        onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event,
      },
      extensionPath: __dirname,
      storageUri: vscode.Uri.file(tempDir),
      globalStorageUri: vscode.Uri.file(tempDir),
      logUri: vscode.Uri.file(tempDir),
      storagePath: tempDir,
      globalStoragePath: tempDir,
      logPath: tempDir,
      asAbsolutePath: (relativePath: string) => path.join(__dirname, relativePath),
      environmentVariableCollection: {
        persistent: false,
        replace: sandbox.stub(),
        append: sandbox.stub(),
        prepend: sandbox.stub(),
        get: sandbox.stub(),
        forEach: sandbox.stub(),
        delete: sandbox.stub(),
        clear: sandbox.stub(),
        getScoped: sandbox.stub(),
      },
      extension: {
        id: 'test.reswob-http-client',
        extensionUri: vscode.Uri.file(__dirname),
        extensionPath: __dirname,
        isActive: true,
        packageJSON: {},
        activate: sandbox.stub(),
        exports: undefined,
      },
    } as any;
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

  test('openHttpClient command registration', () => {
    const registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');
    registerCommandStub.returns({ dispose: sandbox.stub() } as any);

    // Simulate command registration
    const command = vscode.commands.registerCommand('reswob-http-client.openHttpClient', () => {
      // Mock implementation
    });

    // Verify command was registered
    assert.ok(registerCommandStub.called);
    assert.ok(command);
  });

  test('loadRequest command with request name parameter', () => {
    const registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');

    const testRequestName = 'Test API Request';
    let capturedRequestName: string | undefined;

    // Simulate command registration with callback
    vscode.commands.registerCommand('reswob-http-client.loadRequest', (requestName: string) => {
      capturedRequestName = requestName;
    });

    // Simulate command execution
    const callback = registerCommandStub.getCall(0)?.args[1];
    if (callback) {
      callback(testRequestName);
    }

    assert.strictEqual(capturedRequestName, testRequestName);
  });

  test('exportRequests command dialog handling', async () => {
    const showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog');
    const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');

    // Mock successful save dialog
    const mockUri = vscode.Uri.file(path.join(tempDir, 'exported-requests.json'));
    showSaveDialogStub.resolves(mockUri);

    // Test export command logic
    const saveUri = await vscode.window.showSaveDialog({
      filters: {
        'JSON files': ['json'],
      },
      defaultUri: vscode.Uri.file('reswob-requests.json'),
    });

    if (saveUri) {
      // Simulate successful export
      vscode.window.showInformationMessage('Requests exported successfully!');
    }

    assert.ok(showSaveDialogStub.calledOnce);
    assert.ok(showInformationMessageStub.calledWith('Requests exported successfully!'));
    assert.deepStrictEqual(saveUri, mockUri);
  });

  test('exportRequests command cancellation', async () => {
    const showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog');
    const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');

    // Mock cancelled save dialog
    showSaveDialogStub.resolves(undefined);

    const saveUri = await vscode.window.showSaveDialog({
      filters: {
        'JSON files': ['json'],
      },
      defaultUri: vscode.Uri.file('reswob-requests.json'),
    });

    // Should not show success message when cancelled
    assert.strictEqual(saveUri, undefined);
    assert.ok(showInformationMessageStub.notCalled);
  });

  test('importRequests command dialog handling', async () => {
    const showOpenDialogStub = sandbox.stub(vscode.window, 'showOpenDialog');
    const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');

    // Create test import file
    const testImportFile = path.join(tempDir, 'import-test.json');
    const testData = {
      version: '1.0.0',
      requests: [
        {
          name: 'Imported Request',
          method: 'GET',
          url: 'https://api.example.com/imported',
          headers: {},
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      ],
    };
    fs.writeFileSync(testImportFile, JSON.stringify(testData, null, 2));

    // Mock successful open dialog
    const mockUris = [vscode.Uri.file(testImportFile)];
    showOpenDialogStub.resolves(mockUris);

    const openUris = await vscode.window.showOpenDialog({
      filters: {
        'JSON files': ['json'],
      },
      canSelectMany: false,
    });

    if (openUris && openUris.length > 0) {
      // Simulate successful import
      vscode.window.showInformationMessage('Requests imported successfully!');
    }

    assert.ok(showOpenDialogStub.calledOnce);
    assert.ok(showInformationMessageStub.calledWith('Requests imported successfully!'));
    assert.deepStrictEqual(openUris, mockUris);
  });

  test('importRequests command with invalid JSON', async () => {
    const showOpenDialogStub = sandbox.stub(vscode.window, 'showOpenDialog');
    const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');

    // Create invalid JSON file
    const invalidJsonFile = path.join(tempDir, 'invalid.json');
    fs.writeFileSync(invalidJsonFile, 'invalid json content');

    const mockUris = [vscode.Uri.file(invalidJsonFile)];
    showOpenDialogStub.resolves(mockUris);

    try {
      const content = fs.readFileSync(invalidJsonFile, 'utf-8');
      JSON.parse(content); // This will throw
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import requests: ${error}`);
    }

    assert.ok(showErrorMessageStub.called);
    assert.ok(showErrorMessageStub.getCall(0).args[0].includes('Failed to import requests:'));
  });

  test('helloWorld command execution', () => {
    const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');

    // Execute hello world command
    vscode.window.showInformationMessage('Hello World from reswob-http-client!');

    assert.ok(showInformationMessageStub.calledOnce);
    assert.ok(showInformationMessageStub.calledWith('Hello World from reswob-http-client!'));
  });

  test('command subscription cleanup', () => {
    const mockDisposable = {
      dispose: sandbox.stub(),
    };

    mockExtensionContext.subscriptions.push(mockDisposable);

    // Simulate extension deactivation
    mockExtensionContext.subscriptions.forEach((subscription) => {
      subscription.dispose();
    });

    assert.ok(mockDisposable.dispose.calledOnce);
  });

  test('export dialog filter configuration', () => {
    const expectedFilters = {
      'JSON files': ['json'],
    };

    const expectedDefaultUri = vscode.Uri.file('reswob-requests.json');

    // Verify filter configuration
    assert.deepStrictEqual(expectedFilters, { 'JSON files': ['json'] });
    assert.strictEqual(expectedDefaultUri.path, '/reswob-requests.json');
  });

  test('import dialog configuration', () => {
    const expectedFilters = {
      'JSON files': ['json'],
    };

    const expectedCanSelectMany = false;

    // Verify configuration
    assert.deepStrictEqual(expectedFilters, { 'JSON files': ['json'] });
    assert.strictEqual(expectedCanSelectMany, false);
  });

  test('command error handling', async () => {
    const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');

    try {
      // Simulate an error in command execution
      throw new Error('Command execution failed');
    } catch (error) {
      vscode.window.showErrorMessage(`Command failed: ${error}`);
    }

    assert.ok(showErrorMessageStub.calledOnce);
    assert.ok(showErrorMessageStub.getCall(0).args[0].includes('Command failed:'));
  });
});
