// Type definitions for webview environment

declare global {
  function acquireVsCodeApi(): {
    postMessage(message: any): void;
    setState(state: any): void;
    getState(): any;
  };

  interface Window {
    CodeMirror: CodeMirrorConstructor;
  }

  const CodeMirror: CodeMirrorConstructor;
}

// CodeMirror type definitions
export interface CodeMirrorConstructor {
  (element: Element | null, config?: any): any;
}

export interface CodeMirrorEditor {
  getValue(): string;
  setValue(value: string): void;
  setOption(option: string, value: any): void;
  getOption(option: string): any;
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
  focus(): void;
  refresh(): void;
  clearHistory(): void;
  getWrapperElement(): Element;
}

export interface CodeMirrorConfig {
  mode?: string;
  theme?: string;
  lineNumbers?: boolean;
  lineWrapping?: boolean;
  value?: string;
  placeholder?: string;
  autoCloseBrackets?: boolean;
  matchBrackets?: boolean;
  indentUnit?: number;
  tabSize?: number;
  foldGutter?: boolean;
  gutters?: string[];
  readOnly?: boolean;
}

// Request and response types
export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
}

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  collection?: string;
}

// Message types for communication with extension
export interface WebviewMessage {
  command: string;
  data?: any;
}

export interface SendRequestMessage extends WebviewMessage {
  command: 'sendRequest';
  data: HttpRequest;
}

export interface SaveRequestMessage extends WebviewMessage {
  command: 'saveRequest';
  data: SavedRequest;
}

export interface LoadRequestMessage extends WebviewMessage {
  command: 'loadRequest';
  data: { id: string };
}

export interface DeleteRequestMessage extends WebviewMessage {
  command: 'deleteRequest';
  data: { id: string };
}
