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

      // Copy webview files
      const srcWebviewPath = path.join(__dirname, 'src', 'webview');
      const filesToCopy = ['index.html', 'styles.css', 'script.js'];

      filesToCopy.forEach((file) => {
        const srcFile = path.join(srcWebviewPath, file);
        const destFile = path.join(distWebviewPath, file);
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, destFile);
          console.log(`Copied ${file} to dist/webview/`);
        }
      });
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
  const ctx = await esbuild.context({
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
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
