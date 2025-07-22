declare global {
  function acquireVsCodeApi(): {
    postMessage(message: any): void;
    setState(state: any): void;
    getState(): any;
  };

  const CodeMirror: any;

  interface Window {
    removeHeaderRow: (btn: any) => void;
    sendRequest: () => void;
    saveRequest: () => void;
    importRequests: () => void;
  }
}

export {};
