# Reswob HTTP Client

A VS Code extension that provides a built-in HTTP client for testing REST APIs and web services directly within your workspace.

**Current Version: 2.0.3** - Enhanced test suite reliability and developer experience

## Overview

Reswob HTTP Client is a comprehensive VS Code extension that allows developers to:

- Send HTTP requests (GET, POST, PUT, DELETE, etc.) without leaving VS Code
- Save and manage collections of HTTP requests
- Share request collections with team members
- Test APIs during development with an intuitive webview interface

## Features

### ✨ Latest Updates (v2.0.3)

- **Enhanced Test Suite**: Comprehensive test framework improvements with 101 passing tests
- **Developer Experience**: Improved TypeScript compilation and test configuration
- **Bug Fixes**: Resolved test interface compatibility issues and boolean coercion bugs
- **Code Quality**: All tests now passing with 100% success rate for better reliability

### 🌐 Built-in HTTP Client

- Clean, user-friendly interface for sending HTTP requests
- Support for all common HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.)
- Request headers management
- Request body support (JSON, text, form data)
- Response viewing with syntax highlighting

### � Advanced Request Organization (v2.0.0)

- **Collections Support**: Organize HTTP requests into collections for better management
- **Method Badges**: Visual method indicators with colored emoji badges:
  - 🟢 **GET** - Green circle
  - 🟡 **POST** - Yellow circle
  - 🟠 **PUT** - Orange circle
  - 🔴 **DELETE** - Red circle
  - 🟣 **PATCH** - Purple circle
  - 🔵 **HEAD** - Blue circle
  - ⚪ **OPTIONS** - White circle
- **Drag & Drop Support**: Easily reorganize requests between collections and root level
- **Enhanced Tree View**: Improved sidebar with visual feedback and organization

### ⌨️ Power User Features (v2.0.0)

- **Vim Navigation**: Keyboard navigation for efficient workflow:
  - `j/k`: Smooth scrolling with CodeMirror support
  - `g/G`: Go to top/bottom
  - `u/d`: Page up/down navigation
  - `Tab/Enter`: Mode switching with visual feedback
  - `Escape`: Context-aware escape behavior
- **Enhanced Context Menu**: Extended right-click options for requests and collections
- **Performance Optimizations**: Intelligent caching for faster tree operations

### 💾 Request Management

- Save HTTP requests with custom names
- Organize requests in a sidebar tree view
- Load saved requests for quick reuse
- Delete unwanted requests with confirmation

### 📤 Import/Export

- **Postman Compatibility**: Export collections in Postman format (`.postman_collection.json`) for seamless integration with Postman
- **Import Postman Collections**: Import existing Postman collections directly into Reswob
- Export request collections to JSON files (native Reswob format)
- Import request collections from JSON files
- Share request collections between team members
- Version control integration with `.reswob-requests/` folder

#### Supported Formats

- **Postman Collection v2.1**: Full compatibility with Postman's collection format
- **Reswob Native Format**: Optimized format for this extension
- **Automatic Format Detection**: Import process automatically detects file format

### 🎯 VS Code Integration

- Activity bar icon for quick access
- Command palette integration
- Context menus for saved requests and collections
- Follows VS Code theme and styling conventions
- **Comprehensive Testing**: 101 passing unit tests ensure reliability and stability

## Getting Started

1. Install the extension
2. Click the globe icon (🌐) in the Activity Bar to open the HTTP Client
3. Use "Open HTTP Client" command or click "New Request" in the sidebar
4. Fill in your request details and click "Send"
5. Save frequently used requests with the "💾 Save Request" button
6. **New in v2.0.0**: Create collections by clicking the folder icon (📁) in the tree view
7. **New in v2.0.0**: Use drag & drop to organize requests into collections
8. **New in v2.0.0**: Use vim navigation keys (j/k, g/G) for efficient keyboard workflow

## Commands

- `reswob-http-client.openHttpClient` - Open the HTTP Client webview
- `reswob-http-client.saveRequest` - Save the current request
- `reswob-http-client.loadRequest` - Load a saved request
- `reswob-http-client.exportRequests` - Export all requests (choose between Postman or native format)
- `reswob-http-client.importRequests` - Import requests (automatically detects Postman or native format)
- `reswob-http-client.deleteRequest` - Delete a saved request (v2.0.0)
- `reswob-http-client.createCollection` - Create a new collection (v2.0.0)

## Postman Integration

Reswob HTTP Client provides seamless integration with Postman:

### Exporting to Postman

1. Use Command Palette: `Export All Requests`
2. Choose "Postman Collection" format in the save dialog
3. Save as `.postman_collection.json`
4. Import the file directly into Postman

### Importing from Postman

1. Export your collection from Postman as v2.1 format
2. Use Command Palette: `Import Requests`
3. Select your `.postman_collection.json` file
4. Requests will be automatically converted and organized

### Format Conversion Features

- **Headers**: Automatically converts between formats, excluding disabled headers
- **Request Bodies**: Supports raw/JSON body conversion
- **Folders**: Postman folders become Reswob collections
- **URL Formats**: Handles both string and object URL formats from Postman
- **Metadata**: Preserves request names and descriptions where possible

## Documentation

This project includes comprehensive documentation:

- **[ENHANCED_FEATURES.md](./ENHANCED_FEATURES.md)** - New v2.0.0 features: collections, method badges, drag & drop, and enhanced tree view
- **[PERFORMANCE_IMPROVEMENTS.md](./PERFORMANCE_IMPROVEMENTS.md)** - Performance optimizations and Vim navigation improvements in v2.0.0
- **[VIM_NAVIGATION_FIXES.md](./VIM_NAVIGATION_FIXES.md)** - Detailed guide to keyboard navigation and vim-style controls
- **[TYPESCRIPT_WEBVIEW_IMPLEMENTATION.md](./TYPESCRIPT_WEBVIEW_IMPLEMENTATION.md)** - Implementation details for TypeScript webview development
- **[REQUEST_MANAGEMENT.md](./REQUEST_MANAGEMENT.md)** - Detailed guide on saving, loading, and managing HTTP requests, including export/import functionality
- **[WEBVIEW_ARCHITECTURE.md](./WEBVIEW_ARCHITECTURE.md)** - Technical documentation explaining the webview architecture and file structure
- **[WEBVIEW_CHANGES.md](./WEBVIEW_CHANGES.md)** - History of webview improvements and changes
- **[TEST_SUITE_SUMMARY.md](./TEST_SUITE_SUMMARY.md)** - Overview of the comprehensive unit test suite (101 passing tests)
- **[PRE_COMMIT_SETUP.md](./PRE_COMMIT_SETUP.md)** - Development setup guide for automated code formatting and linting
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and release notes
- **[vsc-extension-quickstart.md](./vsc-extension-quickstart.md)** - VS Code extension development quickstart guide

## Requirements

- VS Code version 1.102.0 or higher
- No additional dependencies required

## Development

This extension is built with:

- TypeScript for type safety and modern JavaScript features
- **TypeScript Webview Development** - The webview script is now developed in TypeScript for better development experience
- ESBuild for fast compilation and bundling
- ESLint + Prettier for code quality and formatting
- Husky for pre-commit hooks
- Comprehensive unit tests with Mocha and Sinon

### Scripts

- `npm run compile` - Compile and bundle the extension
- `npm run watch` - Watch mode for development
- `npm run test` - Run the test suite
- `npm run lint` - Lint the codebase
- `npm run format` - Format code with Prettier

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](./LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes (code will be automatically formatted on commit)
4. Run the test suite
5. Submit a pull request

---

**Enjoy using Reswob HTTP Client for all your API testing needs!** 🚀
