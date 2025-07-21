# Enhanced Tree Data Provider Features

This document describes the new enhanced features added to the Reswob HTTP Client tree data provider.

## New Features

### 1. **Method Badges** 🎯

Each HTTP request now displays a colored emoji badge indicating the request method:

- 🟢 **GET** - Green circle
- 🟡 **POST** - Yellow circle
- 🟠 **PUT** - Orange circle
- 🔴 **DELETE** - Red circle
- 🟣 **PATCH** - Purple circle
- 🔵 **HEAD** - Blue circle
- ⚪ **OPTIONS** - White circle
- ⚫ **UNKNOWN** - Black circle (for any other methods)

### 2. **Collections Support** 📁

Organize your HTTP requests into collections for better management:

#### Creating Collections

- Click the folder icon (📁) in the tree view header to create a new collection
- Enter a name for your collection
- Collections appear as expandable folders in the tree

#### Managing Requests in Collections

- **Add to Collection**: Right-click on any request → "Add to Collection"
- **Remove from Collection**: Right-click on a request in a collection → "Remove from Collection"
- **Drag & Drop**: Drag requests between collections or to the root level

### 3. **Drag and Drop Support** 🔄

Easily reorganize your requests:

- Drag requests from the root level into collections
- Drag requests between different collections
- Drag requests out of collections back to the root level
- Visual feedback during drag operations

### 4. **Enhanced Context Menu** 📋

Right-click on tree items for more options:

#### For Requests:

- **Load Request** - Open the request in the HTTP client
- **Delete Request** - Remove the request permanently
- **Add to Collection** - Move request to a collection
- **Remove from Collection** - Move request out of collection

#### For Collections:

- **Delete Collection** - Remove the collection (requests remain in root)

### 5. **Tree Data Provider Delete Functionality** 🗑️

Delete functionality has been moved from the webview to the tree data provider:

- Click the trash icon (🗑️) next to requests or collections
- Confirmation dialogs prevent accidental deletions
- Requests deleted from collections are moved to root, not permanently deleted
- Collections can be deleted while preserving their requests

## Technical Implementation

### Data Structure

```typescript
interface TreeItem {
  type: 'new-request' | 'collection' | 'request';
  id: string;
  name: string;
  method?: string;
  collection?: string;
}

interface RequestCollection {
  version: string;
  requests: HttpRequest[];
  collections: CollectionFolder[];
}

interface CollectionFolder {
  name: string;
  requests: string[];
  color?: string;
}

interface HttpRequest {
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: string;
  collection?: string;
}
```

### Commands Added

- `reswob-http-client.deleteRequest` - Delete a request from tree view
- `reswob-http-client.deleteCollection` - Delete a collection
- `reswob-http-client.createCollection` - Create a new collection
- `reswob-http-client.addToCollection` - Add request to collection
- `reswob-http-client.removeFromCollection` - Remove request from collection

### Drag and Drop

The tree view now implements `TreeDragAndDropController` interface:

- Supports dragging requests between different container types
- Provides visual feedback during drag operations
- Handles drop validation and data transfer

## Usage Examples

### Basic Workflow

1. Create requests using the HTTP client webview
2. Organize related requests into collections using the tree view
3. Use drag and drop to reorganize requests
4. Delete requests or collections directly from the tree view
5. Method badges help identify request types at a glance

### Team Collaboration

- Collections help organize API endpoints by feature or service
- Method badges provide quick visual identification
- Drag and drop makes reorganization effortless
- Export/import functionality works with collections

## Backward Compatibility

- Existing request files are automatically upgraded to support collections
- All existing requests appear in the root level initially
- No data loss when upgrading from previous versions
- Webview delete functionality is preserved for user preference

## Testing

Comprehensive test suite covers:

- Tree item creation for all types (requests, collections, new-request)
- Method badge generation for all HTTP methods
- Tree structure with collections and uncategorized requests
- Event handling and refresh functionality
- Edge cases and error conditions
