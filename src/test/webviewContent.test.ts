import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { getWebviewContent } from '../webviewContent';

suite('WebviewContent Test Suite', () => {
  let sandbox: sinon.SinonSandbox;
  let mockWebview: vscode.Webview;
  let tempDir: string;
  let extensionUri: vscode.Uri;

  setup(() => {
    sandbox = sinon.createSandbox();

    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(__dirname, 'test-webview-'));
    extensionUri = vscode.Uri.file(tempDir);

    // Create test webview files
    const webviewDir = path.join(tempDir, 'src', 'webview');
    fs.mkdirSync(webviewDir, { recursive: true });

    // Create test HTML file
    const testHtml = `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="{{cssUri}}">
</head>
<body>
  <h1>Test HTML</h1>
  <script src="{{scriptUri}}"></script>
</body>
</html>`;
    fs.writeFileSync(path.join(webviewDir, 'index.html'), testHtml);

    // Create test CSS file
    fs.writeFileSync(path.join(webviewDir, 'styles.css'), 'body { margin: 0; }');

    // Create test JS file
    fs.writeFileSync(path.join(webviewDir, 'script.js'), 'console.log("test");');

    // Mock webview
    mockWebview = {
      asWebviewUri: sandbox.stub().callsFake((uri: vscode.Uri) => {
        return vscode.Uri.parse(`vscode-webview://test${uri.path}`);
      }),
      html: '',
      options: {},
      onDidReceiveMessage: sandbox.stub(),
      postMessage: sandbox.stub(),
      cspSource: 'self',
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

  test('getWebviewContent returns HTML with replaced URIs', () => {
    const content = getWebviewContent(mockWebview, extensionUri);

    // Should contain the test HTML structure
    assert.ok(content.includes('<!DOCTYPE html>'));
    assert.ok(content.includes('<h1>Test HTML</h1>'));

    // Should replace CSS URI placeholder
    assert.ok(content.includes('vscode-webview://test'));
    assert.ok(!content.includes('{{cssUri}}'));

    // Should replace script URI placeholder
    assert.ok(!content.includes('{{scriptUri}}'));

    // Verify webview.asWebviewUri was called for CSS and JS files
    assert.strictEqual((mockWebview.asWebviewUri as sinon.SinonStub).callCount, 2);
  });

  test('getWebviewContent handles missing HTML file gracefully', () => {
    // Remove the HTML file
    const htmlPath = path.join(tempDir, 'src', 'webview', 'index.html');
    fs.unlinkSync(htmlPath);

    assert.throws(() => {
      getWebviewContent(mockWebview, extensionUri);
    }, /ENOENT/);
  });

  test('getWebviewContent creates correct webview URIs', () => {
    getWebviewContent(mockWebview, extensionUri);

    const calls = (mockWebview.asWebviewUri as sinon.SinonStub).getCalls();

    // Should call asWebviewUri for styles.css
    const cssCall = calls.find((call) => call.args[0].path.endsWith('styles.css'));
    assert.ok(cssCall, 'Should call asWebviewUri for styles.css');

    // Should call asWebviewUri for script.js
    const jsCall = calls.find((call) => call.args[0].path.endsWith('script.js'));
    assert.ok(jsCall, 'Should call asWebviewUri for script.js');
  });

  test('getWebviewContent preserves HTML structure', () => {
    const content = getWebviewContent(mockWebview, extensionUri);

    // Should maintain proper HTML structure
    assert.ok(content.includes('<html>'));
    assert.ok(content.includes('<head>'));
    assert.ok(content.includes('<body>'));
    assert.ok(content.includes('</html>'));

    // Should include the link and script tags
    assert.ok(content.includes('<link rel="stylesheet"'));
    assert.ok(content.includes('<script src="'));
  });
});
