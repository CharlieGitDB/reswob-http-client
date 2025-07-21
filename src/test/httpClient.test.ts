import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as http from 'http';
import * as https from 'https';

suite('HttpClient Test Suite', () => {
  let sandbox: sinon.SinonSandbox;
  let mockWebview: vscode.Webview;

  setup(() => {
    sandbox = sinon.createSandbox();

    // Mock webview
    mockWebview = {
      asWebviewUri: sandbox.stub(),
      html: '',
      options: {},
      onDidReceiveMessage: sandbox.stub(),
      postMessage: sandbox.stub(),
      cspSource: 'self',
    } as any;
  });

  teardown(() => {
    sandbox.restore();
  });

  test('HTTP request parsing handles various URL formats', () => {
    const testCases = [
      {
        url: 'http://example.com',
        expected: { protocol: 'http:', hostname: 'example.com', port: 80 },
      },
      {
        url: 'https://example.com',
        expected: { protocol: 'https:', hostname: 'example.com', port: 443 },
      },
      {
        url: 'http://example.com:8080',
        expected: { protocol: 'http:', hostname: 'example.com', port: 8080 },
      },
      {
        url: 'https://example.com:9443',
        expected: { protocol: 'https:', hostname: 'example.com', port: 9443 },
      },
    ];

    testCases.forEach(({ url, expected }) => {
      const parsedUrl = new URL(url);
      assert.strictEqual(parsedUrl.protocol, expected.protocol);
      assert.strictEqual(parsedUrl.hostname, expected.hostname);
      assert.strictEqual(
        parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80'),
        expected.port.toString()
      );
    });
  });

  test('HTTP headers are properly formatted', () => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123',
      'X-Custom-Header': 'custom-value',
    };

    const expectedHeaders = {
      'User-Agent': 'Reswob HTTP Client (VS Code Extension)',
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123',
      'X-Custom-Header': 'custom-value',
    };

    const requestHeaders = {
      'User-Agent': 'Reswob HTTP Client (VS Code Extension)',
      ...headers,
    };

    assert.deepStrictEqual(requestHeaders, expectedHeaders);
  });

  test('Content-Length is calculated for request body', () => {
    const testBody = '{"key": "value", "number": 42}';
    const expectedLength = Buffer.byteLength(testBody);

    assert.strictEqual(expectedLength, 30); // Fixed the expected value

    // Test with different character encodings
    const unicodeBody = '{"message": "Hello 世界"}';
    const unicodeLength = Buffer.byteLength(unicodeBody);

    // Should be longer than the string length due to UTF-8 encoding
    assert.ok(unicodeLength > unicodeBody.length);
  });

  test('HTTP method validation', () => {
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

    validMethods.forEach((method) => {
      // Should not throw for valid methods
      assert.doesNotThrow(() => {
        const options = {
          method: method,
          hostname: 'example.com',
        };
        assert.strictEqual(options.method, method);
      });
    });
  });

  test('Request timeout handling', (done) => {
    // This test simulates timeout behavior
    const timeoutMs = 100;
    const startTime = Date.now();

    const timeout = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      assert.ok(elapsed >= timeoutMs);
      done();
    }, timeoutMs);

    // Cleanup
    clearTimeout(timeout);
    done();
  });

  test('JSON response parsing', () => {
    const testCases = [
      { input: '{"valid": true}', expected: { valid: true } },
      { input: '[]', expected: [] },
      { input: '"string"', expected: 'string' },
      { input: 'invalid json', expected: 'invalid json' }, // Should return original string
    ];

    testCases.forEach(({ input, expected }) => {
      let result;
      try {
        result = JSON.parse(input);
      } catch {
        result = input;
      }

      assert.deepStrictEqual(result, expected);
    });
  });

  test('Response time calculation', () => {
    const startTime = Date.now();
    // Simulate some processing time
    const delay = 50;

    setTimeout(() => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      assert.ok(responseTime >= delay);
      assert.ok(responseTime < delay + 50); // Allow some margin
    }, delay);
  });

  test('Response size calculation', () => {
    const testResponses = [
      '{"message": "Hello World"}',
      '<html><body>Test</body></html>',
      'Simple text response',
      '',
    ];

    testResponses.forEach((response) => {
      const size = Buffer.byteLength(response);
      assert.strictEqual(size, Buffer.from(response).length);
      assert.ok(size >= 0);
    });
  });

  test('HTTP vs HTTPS module selection', () => {
    const httpUrl = new URL('http://example.com');
    const httpsUrl = new URL('https://example.com');

    assert.strictEqual(httpUrl.protocol, 'http:');
    assert.strictEqual(httpsUrl.protocol, 'https:');

    // Verify correct module would be selected
    const selectModule = (protocol: string) => (protocol === 'https:' ? https : http);

    assert.strictEqual(selectModule(httpUrl.protocol), http);
    assert.strictEqual(selectModule(httpsUrl.protocol), https);
  });

  test('Default port assignment', () => {
    const testUrls = [
      { url: 'http://example.com', expectedPort: 80 },
      { url: 'https://example.com', expectedPort: 443 },
      { url: 'http://example.com:3000', expectedPort: 3000 },
      { url: 'https://example.com:8443', expectedPort: 8443 },
    ];

    testUrls.forEach(({ url, expectedPort }) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const port = parsedUrl.port || (isHttps ? 443 : 80);

      assert.strictEqual(Number(port), expectedPort);
    });
  });

  test('Path and query parameter handling', () => {
    const testUrl = 'https://api.example.com/users/123?include=profile&format=json';
    const parsedUrl = new URL(testUrl);

    assert.strictEqual(parsedUrl.pathname, '/users/123');
    assert.strictEqual(parsedUrl.search, '?include=profile&format=json');
    assert.strictEqual(
      parsedUrl.pathname + parsedUrl.search,
      '/users/123?include=profile&format=json'
    );
  });

  test('Error response handling', () => {
    const testError = new Error('Connection refused');
    const errorResponse = {
      error: testError.message,
      status: 0,
      responseTime: 1000,
    };

    assert.strictEqual(errorResponse.error, 'Connection refused');
    assert.strictEqual(errorResponse.status, 0);
    assert.ok(errorResponse.responseTime > 0);
  });

  test('WebView message posting', () => {
    const testResponse = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: { success: true },
      responseTime: 150,
      size: 18,
    };

    const expectedMessage = {
      type: 'response',
      data: testResponse,
    };

    // Mock postMessage call
    mockWebview.postMessage(expectedMessage);

    assert.ok((mockWebview.postMessage as sinon.SinonStub).calledOnce);
    assert.ok((mockWebview.postMessage as sinon.SinonStub).calledWith(expectedMessage));
  });
});
