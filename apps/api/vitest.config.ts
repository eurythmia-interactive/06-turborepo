import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['test/**', 'dist/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/main.ts', 'src/**/*.module.ts', 'src/**/*.spec.ts', 'test/**', 'dist/**'],
    },
    testTimeout: 10000,
  },
});
