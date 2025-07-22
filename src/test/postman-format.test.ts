import * as assert from 'assert';
import * as vscode from 'vscode';
import { RequestManager, PostmanCollection, HttpRequest, RequestCollection } from '../extension';

describe('Postman Format Conversion', () => {
  const samplePostmanCollection: PostmanCollection = {
    info: {
      _postman_id: '12345678-abcd-1234-abcd-123456789012',
      name: 'Test Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      description: 'A test collection',
    },
    item: [
      {
        name: 'GET Request',
        request: {
          method: 'GET',
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
            },
            {
              key: 'Authorization',
              value: 'Bearer token123',
              disabled: false,
            },
            {
              key: 'Disabled-Header',
              value: 'should-not-appear',
              disabled: true,
            },
          ],
          url: 'https://api.example.com/users',
        },
      },
      {
        name: 'POST Request',
        request: {
          method: 'POST',
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
            },
          ],
          body: {
            mode: 'raw',
            raw: '{"name": "John Doe", "email": "john@example.com"}',
          },
          url: {
            raw: 'https://api.example.com/users',
            protocol: 'https',
            host: ['api', 'example', 'com'],
            path: ['users'],
          },
        },
      },
    ],
  };

  const sampleReswobCollection: RequestCollection = {
    version: '1.0.0',
    requests: [
      {
        name: 'GET Request',
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        },
        timestamp: '2025-01-01T00:00:00.000Z',
      },
      {
        name: 'POST Request',
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{"name": "John Doe", "email": "john@example.com"}',
        timestamp: '2025-01-01T01:00:00.000Z',
      },
    ],
    collections: [],
  };

  describe('isPostmanCollection', () => {
    it('should identify valid Postman collections', () => {
      const result = RequestManager.isPostmanCollection(samplePostmanCollection);
      assert.strictEqual(result, true);
    });

    it('should reject invalid objects', () => {
      assert.strictEqual(RequestManager.isPostmanCollection(null), false);
      assert.strictEqual(RequestManager.isPostmanCollection({}), false);
      assert.strictEqual(RequestManager.isPostmanCollection({ info: {} }), false);
      assert.strictEqual(RequestManager.isPostmanCollection({ info: { name: 'test' } }), false);
      assert.strictEqual(
        RequestManager.isPostmanCollection({ info: { name: 'test' }, item: [] }),
        false
      );
    });

    it('should accept collections with postman.com schema', () => {
      const validCollection = {
        info: {
          name: 'Test',
          schema: 'https://schema.postman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
      };
      assert.strictEqual(RequestManager.isPostmanCollection(validCollection), true);
    });

    it('should accept collections with getpostman.com schema', () => {
      const validCollection = {
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
      };
      assert.strictEqual(RequestManager.isPostmanCollection(validCollection), true);
    });
  });

  describe('convertFromPostmanFormat', () => {
    it('should convert Postman collection to Reswob format', () => {
      const result = RequestManager.convertFromPostmanFormat(samplePostmanCollection);

      assert.strictEqual(result.version, '1.0.0');
      assert.strictEqual(result.requests.length, 2);

      const getRequest = result.requests[0];
      assert.strictEqual(getRequest.name, 'GET Request');
      assert.strictEqual(getRequest.method, 'GET');
      assert.strictEqual(getRequest.url, 'https://api.example.com/users');
      assert.deepStrictEqual(getRequest.headers, {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123',
      });
      assert.strictEqual(getRequest.body, undefined);

      const postRequest = result.requests[1];
      assert.strictEqual(postRequest.name, 'POST Request');
      assert.strictEqual(postRequest.method, 'POST');
      assert.strictEqual(postRequest.url, 'https://api.example.com/users');
      assert.strictEqual(postRequest.body, '{"name": "John Doe", "email": "john@example.com"}');
    });

    it('should handle empty collections', () => {
      const emptyCollection: PostmanCollection = {
        info: {
          name: 'Empty Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
      };

      const result = RequestManager.convertFromPostmanFormat(emptyCollection);
      assert.strictEqual(result.requests.length, 0);
    });
  });

  describe('convertToPostmanFormat', () => {
    it('should convert Reswob collection to Postman format', () => {
      const result = RequestManager.convertToPostmanFormat(sampleReswobCollection);

      assert.strictEqual(result.info.name, 'Reswob HTTP Client Collection');
      assert.strictEqual(
        result.info.schema,
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      );
      assert.strictEqual(result.item.length, 2);

      const getRequest = result.item[0];
      assert.strictEqual(getRequest.name, 'GET Request');
      assert.strictEqual(getRequest.request.method, 'GET');
      assert.strictEqual(getRequest.request.url, 'https://api.example.com/users');
      assert.strictEqual(getRequest.request.header.length, 2);
      assert.deepStrictEqual(getRequest.request.header[0], {
        key: 'Content-Type',
        value: 'application/json',
      });

      const postRequest = result.item[1];
      assert.strictEqual(postRequest.name, 'POST Request');
      assert.strictEqual(postRequest.request.method, 'POST');
      assert.strictEqual(postRequest.request.body?.mode, 'raw');
      assert.strictEqual(
        postRequest.request.body?.raw,
        '{"name": "John Doe", "email": "john@example.com"}'
      );
    });

    it('should group requests by collection into folders', () => {
      const collectionWithFolders: RequestCollection = {
        version: '1.0.0',
        requests: [
          {
            name: 'Request 1',
            method: 'GET',
            url: 'https://api.example.com/1',
            headers: {},
            timestamp: '2025-01-01T00:00:00.000Z',
            collection: 'Folder A',
          },
          {
            name: 'Request 2',
            method: 'GET',
            url: 'https://api.example.com/2',
            headers: {},
            timestamp: '2025-01-01T01:00:00.000Z',
            collection: 'Folder A',
          },
          {
            name: 'Request 3',
            method: 'GET',
            url: 'https://api.example.com/3',
            headers: {},
            timestamp: '2025-01-01T02:00:00.000Z',
            collection: 'Folder B',
          },
          {
            name: 'Uncategorized Request',
            method: 'GET',
            url: 'https://api.example.com/uncategorized',
            headers: {},
            timestamp: '2025-01-01T03:00:00.000Z',
          },
        ],
        collections: [],
      };

      const result = RequestManager.convertToPostmanFormat(collectionWithFolders);

      // Should have 3 items: 1 uncategorized request + 2 folders
      assert.strictEqual(result.item.length, 3);

      // Find the uncategorized request (should be directly in collection)
      const uncategorizedRequest = result.item.find(
        (item) => item.name === 'Uncategorized Request'
      );
      assert.ok(uncategorizedRequest);
      assert.strictEqual(uncategorizedRequest.request.url, 'https://api.example.com/uncategorized');

      // Find folders
      const folderA = result.item.find((item) => item.name === 'Folder A') as any;
      const folderB = result.item.find((item) => item.name === 'Folder B') as any;

      assert.ok(folderA);
      assert.ok(folderB);
      assert.strictEqual(folderA.item.length, 2);
      assert.strictEqual(folderB.item.length, 1);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUIDs', () => {
      const uuid1 = RequestManager.generateUUID();
      const uuid2 = RequestManager.generateUUID();

      // Should be different
      assert.notStrictEqual(uuid1, uuid2);

      // Should match UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      assert.ok(uuidRegex.test(uuid1));
      assert.ok(uuidRegex.test(uuid2));
    });
  });
});
