import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'test/e2e/**/*.e2e-spec.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
