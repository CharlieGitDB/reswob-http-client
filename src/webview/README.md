# Webview Development with TypeScript

This directory now supports TypeScript development for the webview script. The webview script has been converted from JavaScript to TypeScript to provide better development experience.

## Structure

- `script.ts` - Main webview TypeScript source file
- `types.ts` - Type definitions for webview environment
- `tsconfig.json` - TypeScript configuration for webview
- `script-example.ts` - Example of how to structure new TypeScript webview code
- `index.html` - HTML template for the webview
- `styles.css` - CSS styles for the webview

## Development Workflow

### 1. Editing TypeScript Files

The main webview logic is now in `script.ts`. You can:

- Get full IntelliSense and type checking
- Use modern TypeScript features
- Import types from `types.ts`
- Get better error detection during development

### 2. Building

The TypeScript files are automatically compiled to JavaScript during the build process:

```bash
# Build everything (extension + webview)
npm run compile

# Build with watch mode (rebuilds on file changes)
npm run watch

# Type check webview separately
npm run check-types:webview
```

### 3. Build Process

1. **Extension Build**: `src/extension.ts` → `dist/extension.js`
2. **Webview Build**: `src/webview/script.ts` → `dist/webview/script.js`
3. **Asset Copy**: `src/webview/index.html` and `styles.css` → `dist/webview/`

The webview HTML file automatically loads the compiled `script.js` file.

## TypeScript Configuration

### Main Project (`tsconfig.json`)

- Excludes webview files to avoid DOM type conflicts
- Focuses on Node.js/VS Code extension environment

### Webview (`src/webview/tsconfig.json`)

- Includes DOM types for browser environment
- Less strict for webview-specific code
- Allows flexibility for CodeMirror and other libraries

## Type Safety

The webview now includes:

- **Global APIs**: `acquireVsCodeApi()`, `window`, `document`
- **CodeMirror**: Basic typing for editor instances
- **Message Types**: Typed communication with extension
- **DOM Elements**: Helper functions for type-safe DOM access

## Debugging

- Source maps are generated for debugging TypeScript in browser dev tools
- The original TypeScript files are preserved for debugging
- Build errors show TypeScript line numbers

## Migration Benefits

✅ **Better IntelliSense**: Full code completion for APIs and variables  
✅ **Type Checking**: Catch errors before runtime  
✅ **Refactoring**: Safe renaming and code restructuring  
✅ **Documentation**: Types serve as inline documentation  
✅ **Modern JavaScript**: Use latest language features  
✅ **Import/Export**: Better module organization

## Examples

### Type-safe DOM access:

```typescript
function getInputValue(id: string): string {
  const element = document.getElementById(id) as HTMLInputElement;
  return element ? element.value : '';
}
```

### Typed message handling:

```typescript
interface SendRequestMessage {
  command: 'sendRequest';
  data: HttpRequest;
}

vscode.postMessage({
  command: 'sendRequest',
  data: { method: 'GET', url: '/api', headers: {}, body: '' },
});
```

### CodeMirror with types:

```typescript
let editor: any; // Using any for flexibility with CodeMirror API

function initializeEditor(): void {
  editor = CodeMirror(document.getElementById('editor'), {
    mode: 'application/json',
    theme: 'default',
    lineNumbers: true,
  });
}
```
