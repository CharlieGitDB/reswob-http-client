import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
	// Get the local paths to the webview files
	const webviewPath = vscode.Uri.joinPath(extensionUri, 'src', 'webview');
	const htmlPath = vscode.Uri.joinPath(webviewPath, 'index.html');
	const cssPath = vscode.Uri.joinPath(webviewPath, 'styles.css');
	const scriptPath = vscode.Uri.joinPath(webviewPath, 'script.js');

	// Convert paths to webview URIs
	const cssUri = webview.asWebviewUri(cssPath);
	const scriptUri = webview.asWebviewUri(scriptPath);

	// Read the HTML file
	const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf-8');

	// Replace placeholders with actual URIs
	return htmlContent
		.replace('{{cssUri}}', cssUri.toString())
		.replace('{{scriptUri}}', scriptUri.toString());
}
