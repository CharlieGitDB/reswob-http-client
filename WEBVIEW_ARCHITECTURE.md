# Webview Architecture

## Overview

The HTTP Client webview is now structured with separate files for better maintainability and development experience:

## File Structure

```
src/
├── extension.ts           # Main extension logic
├── webviewContent.ts      # Webview content loader and URI resolver
└── webview/
    ├── index.html         # HTML structure and layout
    ├── styles.css         # CSS styling with VS Code theme variables
    └── script.js          # JavaScript functionality and VS Code API integration
```

## Benefits of This Architecture

### 1. **Separation of Concerns**

- **HTML** (`index.html`): Structure and markup
- **CSS** (`styles.css`): Styling and layout
- **JavaScript** (`script.js`): Functionality and VS Code communication
- **TypeScript** (`webviewContent.ts`): File loading and URI management

### 2. **Development Experience**

- **Syntax highlighting** for HTML, CSS, and JS files
- **IntelliSense** and code completion in each file type
- **Better debugging** with separate files
- **Easier maintenance** and updates

### 3. **VS Code Integration**

- Uses VS Code's webview URI system for security
- Proper resource loading with `asWebviewUri()`
- CSS uses VS Code theme variables for consistent styling
- JavaScript uses VS Code API (`acquireVsCodeApi()`)

## How It Works

### 1. **Content Loading** (`webviewContent.ts`)

```typescript
export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  // Create URIs for webview resources
  const cssUri = webview.asWebviewUri(cssPath);
  const scriptUri = webview.asWebviewUri(scriptPath);

  // Load HTML and replace placeholders
  const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf-8');
  return htmlContent
    .replace('{{cssUri}}', cssUri.toString())
    .replace('{{scriptUri}}', scriptUri.toString());
}
```

### 2. **Resource Security**

VS Code webviews require special URIs for security:

- Files are loaded using `webview.asWebviewUri()`
- Local resource roots are configured in webview options
- Only specified directories can serve content

### 3. **Template System**

The HTML file uses placeholders that are replaced at runtime:

```html
<link rel="stylesheet" href="{{cssUri}}" />
<script src="{{scriptUri}}"></script>
```

## VS Code Theme Integration

### CSS Variables Used:

```css
/* Colors */
--vscode-foreground
--vscode-editor-background
--vscode-input-border
--vscode-input-background
--vscode-input-foreground
--vscode-button-background
--vscode-button-foreground
--vscode-button-hoverBackground

/* Typography */
--vscode-font-family
--vscode-font-size
--vscode-editor-font-family
--vscode-editor-font-size
```

## Communication with Extension

### Webview → Extension (script.js)

```javascript
vscode.postMessage({
  type: 'sendRequest',
  data: requestData,
});
```

### Extension → Webview (extension.ts)

```typescript
webview.postMessage({
  type: 'response',
  data: responseData,
});
```

## Adding New Features

### 1. **HTML Changes**

Edit `src/webview/index.html` for structure changes.

### 2. **Styling Updates**

Edit `src/webview/styles.css` for visual changes.

### 3. **JavaScript Functionality**

Edit `src/webview/script.js` for client-side logic.

### 4. **Extension Integration**

Edit `src/extension.ts` for VS Code API integration.

## Best Practices

1. **Use VS Code theme variables** in CSS for consistency
2. **Keep JavaScript vanilla** to avoid bundling complexity
3. **Use semantic HTML** for accessibility
4. **Handle errors gracefully** in both webview and extension
5. **Validate user input** before sending to extension
6. **Use proper message types** for communication

## Future Improvements

- Consider TypeScript for webview scripts
- Add build process for CSS preprocessing
- Implement proper bundling for complex applications
- Add unit tests for webview functionality
