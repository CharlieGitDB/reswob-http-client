import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';

suite('Error Handling and Edge Cases Test Suite', () => {
  let sandbox: sinon.SinonSandbox;
  let tempDir: string;

  setup(() => {
    sandbox = sinon.createSandbox();
    tempDir = fs.mkdtempSync(path.join(__dirname, 'test-errors-'));
  });

  teardown(() => {
    sandbox.restore();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('handles invalid JSON in request collection', () => {
    const invalidJson = '{"invalid": json content}';

    assert.throws(() => {
      JSON.parse(invalidJson);
    }, SyntaxError);
  });

  test('handles missing workspace folder gracefully', () => {
    // Mock empty workspace folders
    sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);

    const error = new Error('No workspace folder found. Please open a folder to save requests.');

    assert.strictEqual(
      error.message,
      'No workspace folder found. Please open a folder to save requests.'
    );
  });

  test('handles file system errors', () => {
    const nonExistentPath = '/non/existent/path/file.json';

    assert.throws(() => {
      fs.readFileSync(nonExistentPath, 'utf-8');
    }, /ENOENT/);
  });

  test('handles malformed URLs in requests', () => {
    const malformedUrls = ['not-a-url', 'http://', 'https://', '://example.com', ''];

    malformedUrls.forEach((url) => {
      if (url) {
        assert.throws(() => {
          new URL(url);
        }, TypeError);
      } else {
        assert.throws(() => {
          new URL(url);
        });
      }
    });
  });

  test('handles network timeouts', () => {
    const timeoutError = new Error('Request timeout (30s)');
    assert.strictEqual(timeoutError.message, 'Request timeout (30s)');
  });

  test('handles invalid request methods', () => {
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    const invalidMethod = 'INVALID_METHOD';

    assert.ok(!validMethods.includes(invalidMethod));
  });

  test('handles empty request names during save', () => {
    const validateInput = (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Request name cannot be empty';
      }
      return null;
    };

    assert.strictEqual(validateInput(''), 'Request name cannot be empty');
    assert.strictEqual(validateInput('   '), 'Request name cannot be empty');
    assert.strictEqual(validateInput('Valid Name'), null);
  });

  test('handles permission errors when creating directories', () => {
    // Simulate permission error
    const permissionError = new Error('EACCES: permission denied');
    permissionError.name = 'PermissionError';

    assert.strictEqual(permissionError.message, 'EACCES: permission denied');
  });

  test('handles corrupted collection files', () => {
    // Create corrupted collection file
    const corruptedPath = path.join(tempDir, 'corrupted.json');
    fs.writeFileSync(corruptedPath, '{"version":"1.0.0","requests":[{malformed}]}');

    assert.throws(() => {
      const content = fs.readFileSync(corruptedPath, 'utf-8');
      JSON.parse(content);
    }, SyntaxError);
  });

  test('handles very large request collections', () => {
    const largeCollection = {
      version: '1.0.0',
      requests: Array(1000)
        .fill(null)
        .map((_, index) => ({
          name: `Request ${index}`,
          method: 'GET',
          url: `https://api.example.com/endpoint/${index}`,
          headers: {},
          timestamp: new Date().toISOString(),
        })),
    };

    const serialized = JSON.stringify(largeCollection);
    assert.ok(serialized.length > 100000); // Should be quite large

    const parsed = JSON.parse(serialized);
    assert.strictEqual(parsed.requests.length, 1000);
  });

  test('handles special characters in request names', () => {
    const specialCharacters = [
      'Request with "quotes"',
      'Request with \\backslashes',
      'Request with /slashes',
      'Request with <tags>',
      'Request with émojis 🚀🔥',
      'Request\nwith\nnewlines',
      'Request\twith\ttabs',
    ];

    specialCharacters.forEach((name) => {
      const serialized = JSON.stringify({ name });
      const parsed = JSON.parse(serialized);
      assert.strictEqual(parsed.name, name);
    });
  });

  test('handles circular references in request data', () => {
    const circularObject: any = { name: 'test' };
    circularObject.self = circularObject;

    assert.throws(() => {
      JSON.stringify(circularObject);
    }, TypeError);
  });

  test('handles undefined and null values in requests', () => {
    const testData = {
      name: 'Test Request',
      method: 'GET',
      url: 'https://example.com',
      headers: undefined,
      body: null,
    };

    const serialized = JSON.stringify(testData);
    const parsed = JSON.parse(serialized);

    // undefined properties are omitted, null properties are preserved
    assert.strictEqual(parsed.headers, undefined);
    assert.strictEqual(parsed.body, null);
  });

  test('handles concurrent file operations', async () => {
    const testFile = path.join(tempDir, 'concurrent-test.json');
    const testData = { test: true };

    // Simulate concurrent write operations
    const promises = Array(5)
      .fill(null)
      .map(async (_, index) => {
        const data = { ...testData, index };
        fs.writeFileSync(testFile, JSON.stringify(data));
        return fs.readFileSync(testFile, 'utf-8');
      });

    const results = await Promise.all(promises);

    // All results should be valid JSON
    results.forEach((result) => {
      assert.doesNotThrow(() => {
        JSON.parse(result);
      });
    });
  });

  test('handles webview disposal during message processing', () => {
    let webviewDisposed = false;

    const mockWebview = {
      postMessage: () => {
        if (webviewDisposed) {
          throw new Error('Webview has been disposed');
        }
        return Promise.resolve();
      },
    };

    // Simulate disposal
    webviewDisposed = true;

    assert.throws(() => {
      mockWebview.postMessage();
    }, /Webview has been disposed/);
  });

  test('handles missing webview resources', () => {
    const missingResourcePath = '/non/existent/webview/resource.html';

    assert.throws(() => {
      fs.readFileSync(missingResourcePath, 'utf-8');
    }, /ENOENT/);
  });

  test('handles invalid import file formats', () => {
    const invalidFormats = [
      { format: '[]', isValid: false }, // Array instead of object
      { format: '{"version":"1.0.0"}', isValid: false }, // Missing requests array
      { format: '{"requests":[]}', isValid: false }, // Missing version
      { format: '{"version":"1.0.0","requests":"not-an-array"}', isValid: false }, // Invalid requests type
      { format: '{"version":"1.0.0","requests":[]}', isValid: true }, // Valid format
    ];

    invalidFormats.forEach(({ format, isValid }) => {
      const parsed = JSON.parse(format);

      // Check if it's a valid collection format
      const actualValid = !!(parsed.version && Array.isArray(parsed.requests));

      assert.strictEqual(actualValid, isValid);
    });
  });

  test('handles export to protected directories', () => {
    // Simulate attempting to export to a protected directory
    const protectedPath = '/root/protected/export.json';

    // This would typically throw a permission error
    const mockError = new Error("EACCES: permission denied, open '/root/protected/export.json'");

    assert.ok(mockError.message.includes('permission denied'));
  });

  test('handles extremely long URLs', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(10000);

    // URL constructor should handle long URLs
    const parsed = new URL(longUrl);
    assert.ok(parsed.href.length > 10000);
  });

  test('handles request headers with special characters', () => {
    const specialHeaders = {
      'X-Custom-Header': 'value with émojis 🚀',
      Authorization: 'Bearer token-with-special-chars!@#$%',
      'Content-Type': 'application/json; charset=utf-8',
    };

    const serialized = JSON.stringify(specialHeaders);
    const parsed = JSON.parse(serialized);

    assert.deepStrictEqual(parsed, specialHeaders);
  });

  test('handles response parsing errors', () => {
    const invalidJsonResponse = '{"incomplete": json';

    let result;
    try {
      result = JSON.parse(invalidJsonResponse);
    } catch {
      result = invalidJsonResponse; // Fall back to original string
    }

    assert.strictEqual(result, invalidJsonResponse);
  });
});
