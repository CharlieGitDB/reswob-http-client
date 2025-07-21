# Reswob HTTP Client

A VS Code extension that provides a built-in HTTP client for testing REST APIs and web services directly within your workspace.

## Overview

Reswob HTTP Client is a comprehensive VS Code extension that allows developers to:

- Send HTTP requests (GET, POST, PUT, DELETE, etc.) without leaving VS Code
- Save and manage collections of HTTP requests
- Share request collections with team members
- Test APIs during development with an intuitive webview interface

## Features

### 🌐 Built-in HTTP Client

- Clean, user-friendly interface for sending HTTP requests
- Support for all common HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.)
- Request headers management
- Request body support (JSON, text, form data)
- Response viewing with syntax highlighting

### 💾 Request Management

- Save HTTP requests with custom names
- Organize requests in a sidebar tree view
- Load saved requests for quick reuse
- Delete unwanted requests with confirmation

### 📤 Import/Export

- Export request collections to JSON files
- Import request collections from JSON files
- Share request collections between team members
- Version control integration with `.reswob-requests/` folder

### 🎯 VS Code Integration

- Activity bar icon for quick access
- Command palette integration
- Context menus for saved requests
- Follows VS Code theme and styling conventions

## Getting Started

1. Install the extension
2. Click the globe icon (🌐) in the Activity Bar to open the HTTP Client
3. Use "Open HTTP Client" command or click "+ New Request" in the sidebar
4. Fill in your request details and click "Send"
5. Save frequently used requests with the "💾 Save Request" button

## Commands

- `reswob-http-client.openHttpClient` - Open the HTTP Client webview
- `reswob-http-client.saveRequest` - Save the current request
- `reswob-http-client.loadRequest` - Load a saved request
- `reswob-http-client.exportRequests` - Export all requests to a JSON file
- `reswob-http-client.importRequests` - Import requests from a JSON file

## Documentation

This project includes comprehensive documentation:

- **[REQUEST_MANAGEMENT.md](./REQUEST_MANAGEMENT.md)** - Detailed guide on saving, loading, and managing HTTP requests, including export/import functionality
- **[WEBVIEW_ARCHITECTURE.md](./WEBVIEW_ARCHITECTURE.md)** - Technical documentation explaining the webview architecture and file structure
- **[TEST_SUITE_SUMMARY.md](./TEST_SUITE_SUMMARY.md)** - Overview of the comprehensive unit test suite (92 passing tests)
- **[PRE_COMMIT_SETUP.md](./PRE_COMMIT_SETUP.md)** - Development setup guide for automated code formatting and linting
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and release notes
- **[vsc-extension-quickstart.md](./vsc-extension-quickstart.md)** - VS Code extension development quickstart guide

## Requirements

- VS Code version 1.102.0 or higher
- No additional dependencies required

## Development

This extension is built with:

- TypeScript for type safety and modern JavaScript features
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
