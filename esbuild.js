const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const copyWebviewAssetsPlugin = {
  name: 'copy-webview-assets',
  setup(build) {
    build.onEnd(() => {
      // Create dist/webview directory if it doesn't exist
      const distWebviewPath = path.join(__dirname, 'dist', 'webview');
      if (!fs.existsSync(distWebviewPath)) {
        fs.mkdirSync(distWebviewPath, { recursive: true });
      }

      // Copy static webview files (HTML and CSS)
      const srcWebviewPath = path.join(__dirname, 'src', 'webview');
      const staticFilesToCopy = ['index.html', 'styles.css'];

      staticFilesToCopy.forEach((file) => {
        const srcFile = path.join(srcWebviewPath, file);
        const destFile = path.join(distWebviewPath, file);
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, destFile);
          console.log(`Copied ${file} to dist/webview/`);
        }
      });

      // Note: script.js is now compiled from TypeScript by the webview build below
    });
  },
};

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  },
};

async function main() {
  // Build extension
  const extensionCtx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [
      copyWebviewAssetsPlugin,
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin,
    ],
  });

  // Build webview script
  const webviewCtx = await esbuild.context({
    entryPoints: ['src/webview/script.ts'],
    bundle: true,
    format: 'iife',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'browser',
    outfile: 'dist/webview/script.js',
    target: ['es2022'],
    logLevel: 'silent',
    plugins: [esbuildProblemMatcherPlugin],
  });

  if (watch) {
    await extensionCtx.watch();
    await webviewCtx.watch();
  } else {
    await extensionCtx.rebuild();
    await webviewCtx.rebuild();
    await extensionCtx.dispose();
    await webviewCtx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
