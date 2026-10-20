import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Relative assets work locally and under a GitHub Pages repository path.
export default defineConfig({
  base: './',
  build: { rollupOptions: { input: {
    main: fileURLToPath(new URL('./index.html', import.meta.url)),
    tracking: fileURLToPath(new URL('./tracking.html', import.meta.url)),
  } } },
});
