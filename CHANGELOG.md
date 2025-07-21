# Change Log

All notable changes to the "reswob-http-client" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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