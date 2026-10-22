import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';

const revision = process.env.GITHUB_SHA || (() => { try { return execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(); } catch { return 'development'; } })();
const buildNumber = process.env.GITHUB_RUN_NUMBER || 'local';
import { fileURLToPath, URL } from 'node:url';

// Relative assets work locally and under a GitHub Pages repository path.
export default defineConfig({
  base: './',
  define: { __SUTUREHERO_BUILD__: JSON.stringify(buildNumber), __SUTUREHERO_REVISION__: JSON.stringify(revision.slice(0,7)) },
  build: { rollupOptions: { input: {
    main: fileURLToPath(new URL('./index.html', import.meta.url)),
    tracking: fileURLToPath(new URL('./tracking.html', import.meta.url)),
  } } },
});
