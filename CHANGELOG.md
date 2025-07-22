# Change Log

All notable changes to the "reswob-http-client" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [2.0.0] - 2025-07-21

### Added
- **Collections Support** 📁: Organize HTTP requests into collections for better management
  - Create new collections with folder icon in tree view
  - Add/remove requests to/from collections via context menu
  - Drag & drop requests between collections
- **Method Badges** 🎯: Visual method indicators with colored emoji badges (GET 🟢, POST 🟡, PUT 🟠, DELETE 🔴, etc.)
- **Enhanced Tree View**: Complete redesign with improved organization and visual feedback
- **Drag and Drop Support** 🔄: Intuitive request reorganization between collections and root level
- **Enhanced Context Menu** 📋: Extended right-click options for requests and collections
- **Vim Navigation Support**: Added keyboard navigation for power users
  - `j/k`: Smooth scrolling with CodeMirror support
  - `g/G`: Go to top/bottom
  - `u/d`: Page up/down navigation
  - `Tab/Enter`: Mode switching with visual feedback
- **Comprehensive Test Suite**: 92 passing unit tests covering all major components
- **Webview Architecture**: Separated concerns with dedicated HTML, CSS, and JavaScript files
- **Performance Improvements**: Added intelligent caching for tree data provider operations

### Enhanced
- **Request Management**: Improved organization with collections and visual indicators
- **User Interface**: Better visual feedback and navigation options
- **Development Experience**: Modular webview architecture for better maintainability
- **Testing Coverage**: Complete test coverage for reliability and stability

### Technical Improvements
- Added file modification time checking for efficient caching
- Enhanced keyboard navigation with CodeMirror support
- Modular webview structure for better development workflow
- Comprehensive error handling and validation

## [1.0.1] - 2025-07-21

### Fixed
- Fixed webview loading error (ENOENT) when extension is packaged and installed
- Updated build process to properly copy webview assets to dist directory
- Updated webview file paths to reference correct location in packaged extension

### Changed
- Enhanced esbuild configuration with copyWebviewAssetsPlugin to handle webview assets
- Updated webview resource paths from src/webview to dist/webview

## [1.0.0] - Initial Release

### Added
- Initial release
- HTTP client functionality with webview interface
- Request saving and loading capabilities
- Export/import functionality for requests