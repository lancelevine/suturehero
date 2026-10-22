import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    // Frame-by-frame physics regressions need headroom on shared CI runners.
    testTimeout: 20000,
    maxWorkers: 2,
  },
}));
